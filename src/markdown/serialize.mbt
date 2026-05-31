///|
struct TableMarkdownPayload {
  columns : Array[@core.TableColumn]
  rows : Array[Array[@core.TableCell]]
  caption : String?
} derive(ToJson, @json.FromJson)

///|
struct ExcalidrawMarkdownPayload {
  elements : Array[Json]
  app_state : Map[String, Json]?
  files : Map[String, Json]?
  svg : String?
  caption : String?
} derive(ToJson, @json.FromJson)

///|
struct MoonlightMarkdownPayload {
  svg : String
  caption : String?
} derive(ToJson, @json.FromJson)

///|
pub fn document_to_markdown(doc : @core.PapyrDocument) -> String {
  let parts : Array[String] = []
  for block in doc.blocks {
    parts.push(block_to_markdown(block))
  }
  join_blocks(parts)
}

///|
fn block_to_markdown(block : @core.Block) -> String {
  match block {
    @core.Block::Heading(level~, content~, ..) =>
      repeat_hash(level) + " " + inline_text(content)
    @core.Block::Paragraph(content~, ..) => inline_text(content)
    @core.Block::List(ordered~, items~, ..) => list_to_markdown(ordered, items)
    @core.Block::Code(language~, source~, ..) => {
      let lang = language.unwrap_or("")
      "```" + lang + "\n" + source + "\n```"
    }
    @core.Block::Table(columns~, rows~, caption~, ..) =>
      if can_serialize_gfm_table(columns, rows, caption) {
        gfm_table_to_markdown(columns, rows)
      } else {
        "```papyr-table\n" +
        ({ columns, rows, caption } : TableMarkdownPayload)
        .to_json()
        .stringify(indent=2) +
        "\n```"
      }
    @core.Block::Mermaid(source~, ..) => "```mermaid\n" + source + "\n```"
    @core.Block::Moonlight(svg~, caption~, ..) =>
      "```papyr-moonlight\n" +
      ({ svg, caption } : MoonlightMarkdownPayload)
      .to_json()
      .stringify(indent=2) +
      "\n```"
    @core.Block::Excalidraw(elements~, app_state~, files~, svg~, caption~, ..) =>
      "```papyr-excalidraw\n" +
      ({ elements, app_state, files, svg, caption } : ExcalidrawMarkdownPayload)
      .to_json()
      .stringify(indent=2) +
      "\n```"
  }
}

///|
fn list_to_markdown(ordered : Bool, items : Array[@core.ListItem]) -> String {
  let lines : Array[String] = []
  for i, item in items {
    let text = if item.blocks.length() == 0 {
      ""
    } else {
      match item.blocks[0] {
        @core.Block::Paragraph(content~, ..) => inline_text(content)
        _ => block_to_markdown(item.blocks[0])
      }
    }
    let marker = if ordered { "\{i + 1}. " } else { "- " }
    lines.push(marker + text)
  }
  join_lines(lines)
}

///|
fn can_serialize_gfm_table(
  columns : Array[@core.TableColumn],
  rows : Array[Array[@core.TableCell]],
  caption : String?,
) -> Bool {
  if caption is Some(_) || columns.length() == 0 {
    return false
  }
  let used : Array[String] = []
  for i, column in columns {
    if column.width is Some(_) || column.key != unique_column_key(column.header, i, used) {
      return false
    }
  }
  for row in rows {
    if row.length() != columns.length() {
      return false
    }
    for cell in row {
      if cell.colspan is Some(_) || cell.rowspan is Some(_) {
        return false
      }
    }
  }
  true
}

///|
fn gfm_table_to_markdown(
  columns : Array[@core.TableColumn],
  rows : Array[Array[@core.TableCell]],
) -> String {
  let lines : Array[String] = []
  lines.push("| " + join_table_cells(columns.map(fn(c) { c.header })) + " |")
  lines.push("| " + join_table_cells(columns.map(fn(c) { align_marker(c.align) })) + " |")
  for row in rows {
    lines.push("| " + join_table_cells(row.map(fn(c) { c.text })) + " |")
  }
  join_lines(lines)
}

///|
fn align_marker(align : String?) -> String {
  match align {
    Some("left") => ":---"
    Some("center") => ":---:"
    Some("right") => "---:"
    _ => "---"
  }
}

///|
fn join_table_cells(parts : Array[String]) -> String {
  let sb = StringBuilder::new()
  for i, part in parts {
    if i > 0 {
      sb.write_string(" | ")
    }
    sb.write_string(part)
  }
  sb.to_string()
}

///|
fn unique_column_key(header : String, index : Int, used : Array[String]) -> String {
  let base = normalize_column_key(header)
  let root = if base == "" { "column-\{index + 1}" } else { base }
  let mut key = root
  let mut suffix = 2
  while used.contains(key) {
    key = root + "-\{suffix}"
    suffix = suffix + 1
  }
  used.push(key)
  key
}

///|
fn normalize_column_key(value : String) -> String {
  // Keep this intentionally smaller than JavaScript NFKC normalization: the
  // MoonBit bridge only needs deterministic keys for the supported table
  // subset and preserves non-ASCII letters as-is.
  let sb = StringBuilder::new()
  let mut previous_dash = false
  for ch in value.trim() {
    if (ch >= 'A' && ch <= 'Z') {
      if previous_dash && sb.to_string().length() == 0 {
        previous_dash = false
      }
      sb.write_char(Char::from_int(ch.to_int() + 32))
      previous_dash = false
    } else if (ch >= 'a' && ch <= 'z') ||
      (ch >= '0' && ch <= '9') ||
      ch > '~' {
      sb.write_char(ch)
      previous_dash = false
    } else if !previous_dash && sb.to_string().length() > 0 {
      sb.write_char('-')
      previous_dash = true
    }
  }
  let result = sb.to_string()
  if result.has_suffix("-"[:]) {
    result[:result.length() - 1].to_owned()
  } else {
    result
  }
}

///|
fn inline_text(runs : Array[@core.InlineRun]) -> String {
  let sb = StringBuilder::new()
  for run in runs {
    sb.write_string(run_to_markdown(run))
  }
  sb.to_string()
}

///|
fn run_to_markdown(run : @core.InlineRun) -> String {
  let mut text = run.text
  for mark in run.marks {
    if mark == "code" {
      text = "`" + text + "`"
    } else if mark == "bold" {
      text = "**" + text + "**"
    } else if mark == "italic" {
      text = "*" + text + "*"
    } else if mark == "strike" {
      text = "~~" + text + "~~"
    }
  }
  match run.href {
    Some(href) => "[" + text + "](" + href + ")"
    None => text
  }
}

///|
fn repeat_hash(level : Int) -> String {
  let sb = StringBuilder::new()
  for _ in 0..<level {
    sb.write_char('#')
  }
  sb.to_string()
}

///|
fn join_blocks(parts : Array[String]) -> String {
  let sb = StringBuilder::new()
  for i, part in parts {
    if i > 0 {
      sb.write_string("\n\n")
    }
    sb.write_string(part)
  }
  sb.to_string()
}

///|
fn join_lines(parts : Array[String]) -> String {
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
pub fn document_from_json(
  source : String,
) -> Result[@core.PapyrDocument, String] {
  let envelope = @core.parse_papyr_document_json(source)
  match envelope.document {
    Some(doc) if envelope.ok => Ok(doc)
    _ =>
      if envelope.diagnostics.length() == 0 {
        Err("Invalid PapyrDocument JSON")
      } else {
        Err("Invalid PapyrDocument JSON: \{envelope.diagnostics[0].message}")
      }
  }
}
