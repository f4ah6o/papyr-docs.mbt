///|
priv enum ListKind {
  Unordered
  Ordered
}

///|
priv enum InlineMarker {
  Strong
  Emphasis
  UnderscoreEmphasis
  Strike
  Code
  Link
}

///|
pub fn parse_markdown(
  source : String,
  id? : String = "untitled",
) -> @core.PapyrDocument {
  let lines = split_lines(source)
  let blocks : Array[@core.Block] = []
  let mut i = 0
  let mut next_id = 1
  while i < lines.length() {
    let line = lines[i]
    if is_blank(line) {
      i = i + 1
      continue
    }
    if is_fence(line) {
      let (language, body, next_i) = consume_fence(lines, i)
      blocks.push(fence_block(block_id(next_id), language, body))
      next_id = next_id + 1
      i = next_i
      continue
    }
    if is_table_start(lines, i) {
      let (table, next_i) = consume_table(lines, i, block_id(next_id))
      blocks.push(table)
      next_id = next_id + 1
      i = next_i
      continue
    }
    match parse_heading(line) {
      Some((level, text)) => {
        blocks.push(
          @core.Block::Heading(
            id=block_id(next_id),
            level~,
            content=parse_inlines(text),
          ),
        )
        next_id = next_id + 1
        i = i + 1
        continue
      }
      None => ()
    }
    match parse_list_item(line) {
      Some((kind, _)) => {
        let (items, next_i, consumed_ids) = consume_list(
          lines, i, kind, next_id,
        )
        blocks.push(
          @core.Block::List(
            id=block_id(next_id),
            ordered=kind.is_ordered(),
            items~,
          ),
        )
        next_id = next_id + consumed_ids + 1
        i = next_i
        continue
      }
      None => ()
    }
    let (paragraph, next_i) = consume_paragraph(lines, i)
    blocks.push(
      @core.Block::Paragraph(
        id=block_id(next_id),
        content=parse_inlines(paragraph),
      ),
    )
    next_id = next_id + 1
    i = next_i
  }
  { id, title: first_heading(blocks), blocks, meta: None }
}

///|
fn split_lines(content : String) -> Array[String] {
  let lines : Array[String] = []
  for line_view in content.split("\n") {
    lines.push(line_view.to_owned())
  }
  lines
}

///|
fn is_blank(line : String) -> Bool {
  line.trim().length() == 0
}

///|
fn is_fence(line : String) -> Bool {
  line.trim().has_prefix("```"[:])
}

///|
fn is_closing_fence(line : String) -> Bool {
  let trimmed = line.trim().to_owned()
  if !trimmed.has_prefix("```"[:]) {
    return false
  }
  for ch in trimmed[3:] {
    if ch != '`' {
      return false
    }
  }
  true
}

///|
fn parse_heading(line : String) -> (Int, String)? {
  let trimmed = line.trim().to_owned()
  if !trimmed.has_prefix("#"[:]) {
    return None
  }
  let mut level = 0
  for ch in trimmed {
    if ch == '#' {
      level = level + 1
    } else {
      break
    }
  }
  if level == 0 || level > 6 {
    return None
  }
  let rest = trimmed[level:].trim().to_owned()
  if rest.length() == 0 {
    None
  } else {
    Some((level, rest))
  }
}

///|
fn parse_list_item(line : String) -> (ListKind, String)? {
  let trimmed = line.trim().to_owned()
  if trimmed.has_prefix("- "[:]) ||
    trimmed.has_prefix("* "[:]) ||
    trimmed.has_prefix("+ "[:]) {
    return Some((Unordered, trimmed[2:].to_owned()))
  }
  match trimmed.find(". "[:]) {
    Some(pos) if pos > 0 => {
      let prefix = trimmed[:pos]
      if all_digits(prefix) {
        Some((Ordered, trimmed[pos + 2:].to_owned()))
      } else {
        None
      }
    }
    _ => None
  }
}

///|
fn all_digits(view : StringView) -> Bool {
  if view.length() == 0 {
    return false
  }
  for ch in view {
    if ch < '0' || ch > '9' {
      return false
    }
  }
  true
}

///|
fn consume_fence(lines : Array[String], start : Int) -> (String?, String, Int) {
  let opener = lines[start].trim().to_owned()
  let language = if opener.length() > 3 {
    Some(opener[3:].trim().to_owned())
  } else {
    None
  }
  let body_lines : Array[String] = []
  let mut i = start + 1
  while i < lines.length() {
    if is_closing_fence(lines[i]) {
      return (language, join_with_newline(body_lines), i + 1)
    }
    body_lines.push(lines[i])
    i = i + 1
  }
  (language, join_with_newline(body_lines), lines.length())
}

///|
fn fence_block(id : String, language : String?, body : String) -> @core.Block {
  match language {
    Some("papyr-table") =>
      try {
        let payload : TableMarkdownPayload = @json.from_json(@json.parse(body))
        @core.Block::Table(
          id~,
          columns=payload.columns,
          rows=payload.rows,
          caption=payload.caption,
        )
      } catch {
        e => abort("Invalid papyr-table fence payload: \{e}")
      }
    Some("papyr-excalidraw") =>
      try {
        let payload : ExcalidrawMarkdownPayload = @json.from_json(
          @json.parse(body),
        )
        @core.Block::Excalidraw(
          id~,
          elements=payload.elements,
          app_state=payload.app_state,
          files=payload.files,
          svg=payload.svg,
          caption=payload.caption,
        )
      } catch {
        e => abort("Invalid papyr-excalidraw fence payload: \{e}")
      }
    Some("mermaid") => @core.Block::Mermaid(id~, source=body, caption=None)
    _ => @core.Block::Code(id~, language~, source=body)
  }
}

///|
fn is_table_start(lines : Array[String], start : Int) -> Bool {
  start + 1 < lines.length() &&
  looks_like_table_row(lines[start]) &&
  looks_like_table_separator(lines[start + 1]) &&
  split_table_row(lines[start]).length() ==
  split_table_row(lines[start + 1]).length()
}

///|
fn looks_like_table_row(line : String) -> Bool {
  let trimmed = line.trim()
  trimmed.has_prefix("|"[:]) && trimmed.has_suffix("|"[:])
}

///|
fn looks_like_table_separator(line : String) -> Bool {
  if !looks_like_table_row(line) {
    return false
  }
  for cell in split_table_row(line) {
    let value = cell.trim()
    if value.length() < 3 {
      return false
    }
    for ch in value {
      if ch != '-' && ch != ':' {
        return false
      }
    }
  }
  true
}

///|
fn consume_table(
  lines : Array[String],
  start : Int,
  id : String,
) -> (@core.Block, Int) {
  let headers = split_table_row(lines[start])
  let aligns = split_table_row(lines[start + 1])
  let rows : Array[Array[@core.TableCell]] = []
  let mut i = start + 2
  while i < lines.length() && looks_like_table_row(lines[i]) {
    rows.push(
      split_table_row(lines[i]).map(fn(cell) {
        { text: cell.trim().to_owned(), colspan: None, rowspan: None }
      }),
    )
    i = i + 1
  }
  let used : Array[String] = []
  let columns : Array[@core.TableColumn] = []
  for index, header in headers {
    columns.push({
      key: unique_column_key(header.trim().to_owned(), index, used),
      header: header.trim().to_owned(),
      align: table_align(aligns[index].trim().to_owned()),
      width: None,
    })
  }
  (@core.Block::Table(id~, columns~, rows~, caption=None), i)
}

///|
fn split_table_row(line : String) -> Array[String] {
  let trimmed = line.trim().to_owned()
  if trimmed.length() < 2 {
    return []
  }
  let inner = trimmed[1:trimmed.length() - 1].to_owned()
  let cells : Array[String] = []
  for cell in inner.split("|") {
    cells.push(cell.to_owned())
  }
  cells
}

///|
fn table_align(cell : String) -> String? {
  let left = cell.has_prefix(":"[:])
  let right = cell.has_suffix(":"[:])
  if left && right {
    Some("center")
  } else if left {
    Some("left")
  } else if right {
    Some("right")
  } else {
    None
  }
}

///|
fn consume_list(
  lines : Array[String],
  start : Int,
  kind : ListKind,
  first_child_id : Int,
) -> (Array[@core.ListItem], Int, Int) {
  let items : Array[@core.ListItem] = []
  let mut i = start
  let mut consumed_ids = 0
  while i < lines.length() {
    match parse_list_item(lines[i]) {
      Some((item_kind, text)) if item_kind.same_as(kind) => {
        consumed_ids = consumed_ids + 1
        items.push({
          blocks: [
            @core.Block::Paragraph(
              id=block_id(first_child_id + consumed_ids),
              content=parse_inlines(text),
            ),
          ],
        })
        i = i + 1
      }
      _ => break
    }
  }
  (items, i, consumed_ids)
}

///|
fn ListKind::is_ordered(self : ListKind) -> Bool {
  match self {
    Ordered => true
    Unordered => false
  }
}

///|
fn ListKind::same_as(self : ListKind, other : ListKind) -> Bool {
  match (self, other) {
    (Unordered, Unordered) | (Ordered, Ordered) => true
    _ => false
  }
}

///|
fn consume_paragraph(lines : Array[String], start : Int) -> (String, Int) {
  let parts : Array[String] = []
  let mut i = start
  while i < lines.length() {
    let line = lines[i]
    if is_blank(line) {
      break
    }
    if i != start &&
      (
        is_fence(line) ||
        is_table_start(lines, i) ||
        parse_heading(line) is Some(_) ||
        parse_list_item(line) is Some(_)
      ) {
      break
    }
    parts.push(line.trim().to_owned())
    i = i + 1
  }
  (join_with_space(parts), i)
}

///|
fn join_with_space(parts : Array[String]) -> String {
  let sb = StringBuilder::new()
  for i, part in parts {
    if i > 0 {
      sb.write_char(' ')
    }
    sb.write_string(part)
  }
  sb.to_string()
}

///|
fn join_with_newline(parts : Array[String]) -> String {
  let sb = StringBuilder::new()
  for i, part in parts {
    if i > 0 {
      sb.write_char('\n')
    }
    sb.write_string(part)
  }
  sb.to_string()
}

///|
fn first_heading(blocks : Array[@core.Block]) -> String? {
  for block in blocks {
    match block {
      @core.Block::Heading(level=1, content~, ..) =>
        if content.length() > 0 {
          return Some(content[0].text)
        }
      _ => ()
    }
  }
  None
}

///|
fn parse_inlines(text : String) -> Array[@core.InlineRun] {
  let runs : Array[@core.InlineRun] = []
  let mut rest = text
  while rest.length() > 0 {
    match next_inline_marker(rest) {
      Some((pos, marker)) => {
        if pos > 0 {
          runs.push({ text: rest[:pos].to_owned(), marks: [], href: None })
          rest = rest[pos:].to_owned()
          continue
        }
        match consume_inline_marker(rest, marker) {
          Some((run, next_rest)) => {
            runs.push(run)
            rest = next_rest
          }
          None => {
            runs.push({ text: first_char(rest), marks: [], href: None })
            rest = drop_first_char(rest)
          }
        }
      }
      None => {
        runs.push({ text: rest, marks: [], href: None })
        rest = ""
      }
    }
  }
  runs
}

///|
fn next_inline_marker(text : String) -> (Int, InlineMarker)? {
  let mut best_pos : Int? = None
  let mut best_marker : InlineMarker? = None
  let candidates : Array[(String, InlineMarker)] = [
    ("**", Strong),
    ("~~", Strike),
    ("`", Code),
    ("[", Link),
    ("_", UnderscoreEmphasis),
    ("*", Emphasis),
  ]
  for candidate in candidates {
    let (needle, marker) = candidate
    match find_inline_marker_position(text, needle, marker) {
      Some(pos) =>
        match best_pos {
          Some(current) if current <= pos => ()
          _ => {
            best_pos = Some(pos)
            best_marker = Some(marker)
          }
        }
      _ => ()
    }
  }
  match (best_pos, best_marker) {
    (Some(pos), Some(marker)) => Some((pos, marker))
    _ => None
  }
}

///|
fn find_inline_marker_position(
  text : String,
  needle : String,
  marker : InlineMarker,
) -> Int? {
  match marker {
    UnderscoreEmphasis => find_allowed_underscore(text)
    _ => text.find(needle[:])
  }
}

///|
fn find_allowed_underscore(text : String) -> Int? {
  for index, ch in text {
    if ch == '_' && is_underscore_boundary(text, index) {
      return Some(index)
    }
  }
  None
}

///|
fn consume_inline_marker(
  text : String,
  marker : InlineMarker,
) -> (@core.InlineRun, String)? {
  match marker {
    Strong => consume_mark(text, "**", "bold")
    Emphasis => consume_mark(text, "*", "italic")
    UnderscoreEmphasis => consume_underscore_mark(text)
    Strike => consume_mark(text, "~~", "strike")
    Code => consume_mark(text, "`", "code")
    Link => consume_link(text)
  }
}

///|
fn consume_underscore_mark(text : String) -> (@core.InlineRun, String)? {
  if !text.has_prefix("_"[:]) || !is_underscore_boundary(text, 0) {
    return None
  }
  let tail = text[1:].to_owned()
  match find_closing_underscore(tail) {
    Some(close) => {
      let inner = tail[:close].to_owned()
      let rest = tail[close + 1:].to_owned()
      Some(({ text: inner, marks: ["italic"], href: None }, rest))
    }
    None => None
  }
}

///|
fn find_closing_underscore(text : String) -> Int? {
  for index, ch in text {
    if ch == '_' && is_underscore_boundary(text, index) {
      return Some(index)
    }
  }
  None
}

///|
fn is_underscore_boundary(text : String, index : Int) -> Bool {
  !(is_word_char_at(text, index - 1) && is_word_char_at(text, index + 1))
}

///|
fn is_word_char_at(text : String, target : Int) -> Bool {
  if target < 0 {
    return false
  }
  for index, ch in text {
    if index == target {
      return is_ascii_word_char(ch)
    }
  }
  false
}

///|
fn is_ascii_word_char(ch : Char) -> Bool {
  (ch >= 'A' && ch <= 'Z') ||
  (ch >= 'a' && ch <= 'z') ||
  (ch >= '0' && ch <= '9') ||
  ch == '_'
}

///|
fn consume_mark(
  text : String,
  delimiter : String,
  mark : String,
) -> (@core.InlineRun, String)? {
  if !text.has_prefix(delimiter[:]) {
    return None
  }
  let tail = text[delimiter.length():].to_owned()
  match tail.find(delimiter[:]) {
    Some(close) => {
      let inner = tail[:close].to_owned()
      let rest = tail[close + delimiter.length():].to_owned()
      Some(({ text: inner, marks: [mark], href: None }, rest))
    }
    None => None
  }
}

///|
fn consume_link(text : String) -> (@core.InlineRun, String)? {
  if !text.has_prefix("["[:]) {
    return None
  }
  let tail = text[1:].to_owned()
  match tail.find("]("[:]) {
    Some(label_end) => {
      let label = tail[:label_end].to_owned()
      let url_tail = tail[label_end + 2:].to_owned()
      match url_tail.find(")"[:]) {
        Some(url_end) => {
          let href = url_tail[:url_end].to_owned()
          let rest = url_tail[url_end + 1:].to_owned()
          Some(({ text: label, marks: ["link"], href: Some(href) }, rest))
        }
        None => None
      }
    }
    None => None
  }
}

///|
fn first_char(text : String) -> String {
  let sb = StringBuilder::new()
  for ch in text {
    sb.write_char(ch)
    return sb.to_string()
  }
  ""
}

///|
fn drop_first_char(text : String) -> String {
  let mut skipped = false
  let sb = StringBuilder::new()
  for ch in text {
    if skipped {
      sb.write_char(ch)
    } else {
      skipped = true
    }
  }
  sb.to_string()
}
