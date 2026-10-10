///|
fn valid_document_json() -> Json {
  try! @json.parse(
    (
      #|{
      #|  "id": "intro",
      #|  "title": "Intro",
      #|  "blocks": [
      #|    ["Heading", {"id": "h1", "level": 1, "content": [{"text": "Intro", "marks": []}]}],
      #|    ["Paragraph", {"id": "p1", "content": [{"text": "docs", "marks": ["link"], "href": "https://example.test"}]}]
      #|  ],
      #|  "meta": {"source": "test"}
      #|}
    ),
  )
}

///|
fn moonlight_document_json() -> Json {
  try! @json.parse(
    (
      #|{
      #|  "id": "moonlight-sample",
      #|  "title": "Moonlight Sample",
      #|  "blocks": [
      #|    ["Heading", {"id": "h1", "level": 1, "content": [{"text": "Moonlight Sample", "marks": []}]}],
      #|    ["Moonlight", {
      #|      "id": "moonlight-1",
      #|      "svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1200\" height=\"800\" viewBox=\"0 0 1200 800\" data-moonlight=\"1.0\"><rect width=\"100%\" height=\"100%\" fill=\"#ffffff\"/></svg>",
      #|      "caption": "Editable Moonlight diagram"
      #|    }]
      #|  ],
      #|  "meta": {"source": "moonlight"}
      #|}
    ),
  )
}

///|
test "papyr document middleware accepts valid document json" {
  let envelope = validate_papyr_document_json(valid_document_json())
  inspect(envelope.ok, content="true")
  inspect(envelope.document.unwrap().id, content="intro")
  inspect(envelope.diagnostics.length(), content="0")
}

///|
test "papyr document middleware accepts moonlight block json" {
  let envelope = validate_papyr_document_json(moonlight_document_json())
  inspect(envelope.ok, content="true")
  inspect(envelope.diagnostics.length(), content="0")
  match envelope.document.unwrap().blocks[1] {
    Moonlight(id~, caption~, ..) => {
      inspect(id, content="moonlight-1")
      inspect(caption.unwrap(), content="Editable Moonlight diagram")
    }
    _ => inspect(false, content="true")
  }
}

///|
test "papyr document middleware reports validation diagnostics" {
  let doc : PapyrDocument = {
    id: "",
    title: None,
    blocks: [
      Heading(id="h1", level=7, content=[
        { text: "bad", marks: ["strong", "link"], href: None, },
      ]),
      List(id="l1", ordered=false, items=[{ blocks: [], }]),
    ],
    meta: None,
  }
  let envelope = validate_papyr_document(doc)
  inspect(envelope.ok, content="false")
  inspect(envelope.diagnostics.length(), content="5")
  inspect(envelope.diagnostics[0].path, content="id")
  inspect(envelope.diagnostics[1].path, content="blocks.0.level")
  inspect(envelope.diagnostics[2].path, content="blocks.0.content.0.marks.0")
  inspect(envelope.diagnostics[3].path, content="blocks.0.content.0.href")
  inspect(envelope.diagnostics[4].path, content="blocks.1.items.0.blocks")
}

///|
test "papyr document middleware recursively validates nested list blocks" {
  let doc : PapyrDocument = {
    id: "nested",
    title: None,
    blocks: [
      List(id="l1", ordered=false, items=[
        { blocks: [Heading(id="h1", level=9, content=[])], },
      ]),
    ],
    meta: None,
  }
  let envelope = validate_papyr_document(doc)
  inspect(envelope.ok, content="false")
  inspect(
    envelope.diagnostics[0].path,
    content="blocks.0.items.0.blocks.0.level",
  )
}

///|
test "papyr document middleware parse errors stay in envelope" {
  let envelope = parse_papyr_document_json("{")
  inspect(envelope.ok, content="false")
  inspect(envelope.document is None, content="true")
  inspect(envelope.diagnostics[0].code, content="json_parse_error")
}
