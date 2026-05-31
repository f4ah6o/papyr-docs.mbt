///|
test "raw relation key keeps integer order compatible with TypeScript" {
  let relation : RawRelation = {
    source: "chapter-a",
    target: "book-a",
    rel: "parent",
    metadata: Some({ label: None, order: Some(2.0) }),
  }
  inspect(
    raw_relation_key(relation),
    content="chapter-a\u{0000}book-a\u{0000}parent\u{0000}2\u{0000}",
  )
}

///|
test "raw relation key preserves non-integer order" {
  let relation : RawRelation = {
    source: "a",
    target: "b",
    rel: "sequence",
    metadata: Some({ label: Some("half"), order: Some(1.5) }),
  }
  inspect(
    raw_relation_key(relation),
    content="a\u{0000}b\u{0000}sequence\u{0000}1.5\u{0000}half",
  )
}
