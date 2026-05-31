///|
fn index_path(base : String, index : Int) -> String {
  path_join(base, index.to_string())
}

///|
fn parse_error(message : String) -> Diagnostic {
  {
    kind: "parse",
    code: "json_parse_error",
    path: "",
    message,
    expected: None,
    received: None,
  }
}
