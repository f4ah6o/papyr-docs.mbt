///|
pub(all) struct PapyrDocumentEnvelope {
  ok : Bool
  tool : String
  document : PapyrDocument?
  diagnostics : Array[Diagnostic]
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub fn parse_papyr_document_json(source : String) -> PapyrDocumentEnvelope {
  validate_papyr_document_json(@json.parse(source)) catch {
    e =>
      {
        ok: false,
        tool: "parse_papyr_document_json",
        document: None,
        diagnostics: [parse_error("Invalid PapyrDocument JSON: \{e}")],
      }
  }
}

///|
pub fn validate_papyr_document_json(json : Json) -> PapyrDocumentEnvelope {
  try {
    let doc : PapyrDocument = @json.from_json(json)
    let result = validate_papyr_document(doc)
    {
      ok: result.ok,
      tool: "validate_papyr_document_json",
      document: result.document,
      diagnostics: result.diagnostics,
    }
  } catch {
    e =>
      {
        ok: false,
        tool: "validate_papyr_document_json",
        document: None,
        diagnostics: [
          expected_type("", "PapyrDocument", "invalid JSON shape: \{e}"),
        ],
      }
  }
}

///|
pub fn validate_papyr_document(doc : PapyrDocument) -> PapyrDocumentEnvelope {
  let diagnostics : Array[Diagnostic] = []
  if doc.id == "" {
    diagnostics.push(invalid_value("id", "non-empty string", "empty string"))
  }
  validate_blocks(doc.blocks, "blocks", diagnostics)
  {
    ok: diagnostics.length() == 0,
    tool: "validate_papyr_document",
    document: if diagnostics.length() == 0 {
      Some(doc)
    } else {
      None
    },
    diagnostics,
  }
}

///|
fn validate_blocks(
  blocks : Array[Block],
  path : String,
  diagnostics : Array[Diagnostic],
) -> Unit {
  for i, block in blocks {
    validate_block(block, index_path(path, i), diagnostics)
  }
}

///|
fn validate_block(
  block : Block,
  path : String,
  diagnostics : Array[Diagnostic],
) -> Unit {
  match block {
    Heading(level~, content~, ..) => {
      if level < 1 || level > 6 {
        diagnostics.push(
          invalid_value(
            path_join(path, "level"),
            "integer in range 1..6",
            level.to_string(),
          ),
        )
      }
      validate_inline_runs(content, path_join(path, "content"), diagnostics)
    }
    Paragraph(content~, ..) =>
      validate_inline_runs(content, path_join(path, "content"), diagnostics)
    List(items~, ..) =>
      for i, item in items {
        validate_list_item(
          item,
          index_path(path_join(path, "items"), i),
          diagnostics,
        )
      }
    Code(_) => ()
    Table(_) => ()
    Mermaid(_) => ()
    Moonlight(_) => ()
    Excalidraw(_) => ()
  }
}

///|
fn validate_list_item(
  item : ListItem,
  path : String,
  diagnostics : Array[Diagnostic],
) -> Unit {
  if item.blocks.length() == 0 {
    diagnostics.push(
      invalid_value(
        path_join(path, "blocks"),
        "at least one block",
        "empty array",
      ),
    )
  }
  validate_blocks(item.blocks, path_join(path, "blocks"), diagnostics)
}

///|
fn validate_inline_runs(
  runs : Array[InlineRun],
  path : String,
  diagnostics : Array[Diagnostic],
) -> Unit {
  for i, run in runs {
    validate_inline_run(run, index_path(path, i), diagnostics)
  }
}

///|
fn validate_inline_run(
  run : InlineRun,
  path : String,
  diagnostics : Array[Diagnostic],
) -> Unit {
  let mut has_link = false
  for i, mark in run.marks {
    if mark == "link" {
      has_link = true
    } else if mark != "bold" &&
      mark != "italic" &&
      mark != "code" &&
      mark != "strike" {
      diagnostics.push(
        invalid_value(
          index_path(path_join(path, "marks"), i),
          "one of bold, italic, code, strike, link",
          mark,
        ),
      )
    }
  }
  if has_link && run.href is None {
    diagnostics.push(missing_field(path, "href"))
  }
}
