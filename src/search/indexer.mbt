///|
pub struct BlockSnapshot {
  id : String
  kind : String
  text : String
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub struct IndexableDocument {
  id : String
  title : String
  headings : String
  body : String
  blocks : Array[BlockSnapshot]
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct SnippetRequest {
  text : String
  query : String
  context : Int?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct SnippetResult {
  snippet : String?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub fn search_block_text(block : @core.Block) -> String {
  match block {
    @core.Heading(content~, ..) => inline_text(content)
    @core.Paragraph(content~, ..) => inline_text(content)
    @core.List(items~, ..) => list_text(items)
    @core.Code(source~, ..) => source
    @core.Mermaid(source~, ..) => source
    @core.Moonlight(svg~, caption~, ..) =>
      join_non_empty([caption.unwrap_or(""), moonlight_svg_text(svg)], " ")
    @core.Table(rows~, ..) => table_text(rows)
    @core.Excalidraw(elements~, ..) => excalidraw_text(elements)
  }
}

///|
pub fn search_to_indexable(document : @core.PapyrDocument) -> IndexableDocument {
  let all_blocks : Array[@core.Block] = []
  for block in document.blocks {
    push_flattened_block(all_blocks, block)
  }
  let snapshots : Array[BlockSnapshot] = []
  let headings : Array[String] = []
  for block in all_blocks {
    let text = search_block_text(block)
    snapshots.push({ id: block_id(block), kind: block_type(block), text })
    match block {
      @core.Heading(..) => headings.push(text)
      _ => ()
    }
  }
  let body_parts : Array[String] = []
  for block in document.blocks {
    body_parts.push(search_block_text(block))
  }
  {
    id: document.id,
    title: document.title.unwrap_or(""),
    headings: join_with(headings, "\n"),
    body: join_with(body_parts, "\n"),
    blocks: snapshots,
  }
}

///|
pub fn search_extract_snippet(
  text : String,
  query : String,
  context? : Int = 40,
) -> String? {
  let terms = search_terms(query)
  if terms.length() == 0 {
    return None
  }
  let lower = text.to_lower()
  let mut earliest = -1
  let mut matched_term = ""
  for term in terms {
    let idx = index_of(lower, term)
    if idx >= 0 && (earliest < 0 || idx < earliest) {
      earliest = idx
      matched_term = term
    }
  }
  if earliest < 0 {
    return None
  }
  let start = max_int(0, earliest - context)
  let end = min_int(text.length(), earliest + matched_term.length() + context)
  let prefix = if start > 0 { "…" } else { "" }
  let suffix = if end < text.length() { "…" } else { "" }
  Some(prefix + text[start:end].to_owned() + suffix)
}

///|
pub fn search_extract_snippet_request(
  request : SnippetRequest,
) -> SnippetResult {
  {
    snippet: search_extract_snippet(
      request.text,
      request.query,
      context=request.context.unwrap_or(40),
    ),
  }
}

///|
fn inline_text(inline : Array[@core.InlineRun]) -> String {
  let sb = StringBuilder::new()
  for run in inline {
    sb.write_string(run.text)
  }
  sb.to_string()
}

///|
fn list_text(items : Array[@core.ListItem]) -> String {
  let parts : Array[String] = []
  for item in items {
    let item_parts : Array[String] = []
    for block in item.blocks {
      item_parts.push(search_block_text(block))
    }
    parts.push(join_with(item_parts, "\n"))
  }
  join_with(parts, "\n")
}

///|
fn table_text(rows : Array[Array[@core.TableCell]]) -> String {
  let parts : Array[String] = []
  for row in rows {
    for cell in row {
      parts.push(cell.text)
    }
  }
  join_with(parts, " ")
}

///|
fn excalidraw_text(elements : Array[Json]) -> String {
  let parts : Array[String] = []
  for element in elements {
    match json_field(element, "text") {
      Some(Json::String(text)) if text.length() > 0 => parts.push(text)
      _ => ()
    }
  }
  join_with(parts, " ")
}

///|
fn moonlight_svg_text(svg : String) -> String {
  let parts : Array[String] = []
  let mut rest = svg
  while rest.length() > 0 {
    match rest.to_lower().find("<text"[:]) {
      None => break
      Some(open_start) => {
        let after_open = rest[open_start:].to_owned()
        match after_open.find(">"[:]) {
          None => break
          Some(open_end) => {
            let content_start = open_start + open_end + 1
            let content_tail = rest[content_start:].to_owned()
            match content_tail.to_lower().find("</text>"[:]) {
              None => break
              Some(close_start) => {
                let value = decode_basic_entities(
                  strip_tags(content_tail[:close_start].to_owned()).trim().to_owned(),
                )
                if value.length() > 0 {
                  parts.push(value)
                }
                rest = content_tail[close_start + "</text>".length():].to_owned()
              }
            }
          }
        }
      }
    }
  }
  join_with(parts, " ")
}

///|
fn strip_tags(value : String) -> String {
  let sb = StringBuilder::new()
  let mut in_tag = false
  for ch in value {
    match ch {
      '<' => in_tag = true
      '>' => in_tag = false
      _ if !in_tag => sb.write_char(ch)
      _ => ()
    }
  }
  sb.to_string()
}

///|
fn decode_basic_entities(value : String) -> String {
  value
  .replace(old="&lt;", new="<")
  .replace(old="&gt;", new=">")
  .replace(old="&amp;", new="&")
  .replace(old="&quot;", new="\"")
  .replace(old="&#39;", new="'")
}

///|
fn push_flattened_block(
  result : Array[@core.Block],
  block : @core.Block,
) -> Unit {
  result.push(block)
  match block {
    @core.List(items~, ..) =>
      for item in items {
        for child in item.blocks {
          push_flattened_block(result, child)
        }
      }
    _ => ()
  }
}

///|
fn block_id(block : @core.Block) -> String {
  match block {
    @core.Heading(id~, ..) => id
    @core.Paragraph(id~, ..) => id
    @core.List(id~, ..) => id
    @core.Code(id~, ..) => id
    @core.Table(id~, ..) => id
    @core.Mermaid(id~, ..) => id
    @core.Moonlight(id~, ..) => id
    @core.Excalidraw(id~, ..) => id
  }
}

///|
fn block_type(block : @core.Block) -> String {
  match block {
    @core.Heading(..) => "heading"
    @core.Paragraph(..) => "paragraph"
    @core.List(..) => "list"
    @core.Code(..) => "code"
    @core.Table(..) => "table"
    @core.Mermaid(..) => "mermaid"
    @core.Moonlight(..) => "moonlight"
    @core.Excalidraw(..) => "excalidraw"
  }
}

///|
fn search_terms(query : String) -> Array[String] {
  let terms : Array[String] = []
  for part in query.to_lower().split(" ") {
    let term = part.trim().to_owned()
    if term.length() > 0 {
      terms.push(term)
    }
  }
  terms
}

///|
fn index_of(text : String, term : String) -> Int {
  if term.length() == 0 {
    return 0
  }
  if term.length() > text.length() {
    return -1
  }
  for i in 0..<=(text.length() - term.length()) {
    if text[i:i + term.length()].to_owned() == term {
      return i
    }
  }
  -1
}

///|
fn json_field(value : Json, name : String) -> Json? {
  match value {
    Json::Object(map) => map.get(name)
    _ => None
  }
}

///|
fn join_non_empty(parts : Array[String], separator : String) -> String {
  let kept : Array[String] = []
  for part in parts {
    if part.length() > 0 {
      kept.push(part)
    }
  }
  join_with(kept, separator)
}

///|
fn join_with(parts : Array[String], separator : String) -> String {
  let sb = StringBuilder::new()
  for i, part in parts {
    if i > 0 {
      sb.write_string(separator)
    }
    sb.write_string(part)
  }
  sb.to_string()
}

///|
fn min_int(left : Int, right : Int) -> Int {
  if left < right {
    left
  } else {
    right
  }
}

///|
fn max_int(left : Int, right : Int) -> Int {
  if left > right {
    left
  } else {
    right
  }
}
