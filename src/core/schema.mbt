///|
pub(all) struct InlineRun {
  text : String
  marks : Array[String]
  href : String?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct ListItem {
  blocks : Array[Block]
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct TableColumn {
  key : String
  header : String
  align : String?
  width : Json?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct TableCell {
  text : String
  colspan : Int?
  rowspan : Int?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) enum Block {
  Heading(id~ : String, level~ : Int, content~ : Array[InlineRun])
  Paragraph(id~ : String, content~ : Array[InlineRun])
  List(id~ : String, ordered~ : Bool, items~ : Array[ListItem])
  Code(id~ : String, language~ : String?, source~ : String)
  Table(
    id~ : String,
    columns~ : Array[TableColumn],
    rows~ : Array[Array[TableCell]],
    caption~ : String?
  )
  Mermaid(id~ : String, source~ : String, caption~ : String?)
  Moonlight(id~ : String, svg~ : String, caption~ : String?)
  Excalidraw(
    id~ : String,
    elements~ : Array[Json],
    app_state~ : Map[String, Json]?,
    files~ : Map[String, Json]?,
    svg~ : String?,
    caption~ : String?
  )
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PapyrDocument {
  id : String
  title : String?
  blocks : Array[Block]
  meta : Json?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct Diagnostic {
  kind : String
  code : String
  path : String
  message : String
  expected : String?
  received : String?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
fn path_join(base : String, segment : String) -> String {
  if base == "" {
    segment
  } else if segment == "" {
    base
  } else {
    base + "." + segment
  }
}

///|
fn missing_field(path : String, field : String) -> Diagnostic {
  {
    kind: "validation",
    code: "missing_field",
    path: path_join(path, field),
    message: "Missing required field \{field}",
    expected: Some("present"),
    received: Some("missing"),
  }
}

///|
fn expected_type(
  path : String,
  expected : String,
  received : String,
) -> Diagnostic {
  {
    kind: "validation",
    code: "expected_type",
    path,
    message: "Expected \{expected} but received \{received}",
    expected: Some(expected),
    received: Some(received),
  }
}

///|
fn invalid_value(
  path : String,
  expected : String,
  received : String,
) -> Diagnostic {
  {
    kind: "validation",
    code: "invalid_value",
    path,
    message: "Expected \{expected} but received \{received}",
    expected: Some(expected),
    received: Some(received),
  }
}
