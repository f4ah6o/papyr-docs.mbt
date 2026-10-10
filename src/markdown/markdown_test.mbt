///|
test "parse markdown creates PapyrDocument blocks" {
  let doc = parse_markdown(
    (
      #|# Intro
      #|
      #|Hello MoonBit.
      #|
      #|- one
      #|- two
      #|
      #|```moonbit
      #|test {}
      #|```
    ),
    id="intro",
  )
  @json.json_inspect(doc, content={
    "id": "intro",
    "title": "Intro",
    "blocks": [
      [
        "Heading",
        {
          "id": "b1",
          "level": 1,
          "content": [{ "text": "Intro", "marks": [] }],
        },
      ],
      [
        "Paragraph",
        { "id": "b2", "content": [{ "text": "Hello MoonBit.", "marks": [] }] },
      ],
      [
        "List",
        {
          "id": "b3",
          "ordered": false,
          "items": [
            {
              "blocks": [
                [
                  "Paragraph",
                  { "id": "b4", "content": [{ "text": "one", "marks": [] }] },
                ],
              ],
            },
            {
              "blocks": [
                [
                  "Paragraph",
                  { "id": "b5", "content": [{ "text": "two", "marks": [] }] },
                ],
              ],
            },
          ],
        },
      ],
      ["Code", { "id": "b6", "language": "moonbit", "source": "test {}" }],
    ],
  })
}

///|
test "serialize markdown document preserves implemented subset" {
  let doc = parse_markdown(
    "# Intro\n\nHello.\n\n1. first\n2. second",
    id="intro",
  )
  inspect(
    document_to_markdown(doc),
    content=(
      #|# Intro
      #|
      #|Hello.
      #|
      #|1. first
      #|2. second
    ),
  )
}

///|
test "parse markdown preserves inline marks links and code" {
  let doc = parse_markdown(
    "Hello **MoonBit**, *Papyr*, `code`, and [docs](https://example.test).",
    id="inline",
  )
  @json.json_inspect(doc.blocks, content=[
    [
      "Paragraph",
      {
        "id": "b1",
        "content": [
          { "text": "Hello ", "marks": [] },
          { "text": "MoonBit", "marks": ["bold"] },
          { "text": ", ", "marks": [] },
          { "text": "Papyr", "marks": ["italic"] },
          { "text": ", ", "marks": [] },
          { "text": "code", "marks": ["code"] },
          { "text": ", and ", "marks": [] },
          { "text": "docs", "marks": ["link"], "href": "https://example.test" },
          { "text": ".", "marks": [] },
        ],
      },
    ],
  ])
}

///|
test "parse markdown keeps underscores inside identifiers as text" {
  let doc = parse_markdown("some_variable and _italic_", id="inline")
  @json.json_inspect(doc.blocks, content=[
    [
      "Paragraph",
      {
        "id": "b1",
        "content": [
          { "text": "some_variable and ", "marks": [] },
          { "text": "italic", "marks": ["italic"] },
        ],
      },
    ],
  ])
}

///|
test "parse markdown splits paragraph before adjacent table" {
  let doc = parse_markdown("Intro\n| Name |\n| --- |\n| Alice |", id="table")
  @json.json_inspect(doc.blocks, content=[
    ["Paragraph", { "id": "b1", "content": [{ "text": "Intro", "marks": [] }] }],
    [
      "Table",
      {
        "id": "b2",
        "columns": [{ "key": "name", "header": "Name" }],
        "rows": [[{ "text": "Alice" }]],
      },
    ],
  ])
}

///|
test "serialize markdown preserves inline subset" {
  let source = "Hello **MoonBit**, *Papyr*, `code`, and [docs](https://example.test)."
  inspect(document_to_markdown(parse_markdown(source)), content=source)
}

///|
test "serialize markdown keeps table mermaid and excalidraw mirrors" {
  let doc : @core.PapyrDocument = {
    id: "rich",
    title: Some("Rich"),
    blocks: [
      @core.Block::Table(
        id="table-1",
        columns=[{ key: "name", header: "Name", align: None, width: None, }],
        rows=[[{ text: "Papyr", colspan: None, rowspan: None, }]],
        caption=Some("Projects"),
      ),
      @core.Block::Mermaid(id="m1", source="graph TD; A-->B;", caption=None),
      @core.Block::Excalidraw(
        id="ex1",
        elements=[Json::object({ "type": "rectangle".to_json() })],
        app_state=None,
        files=None,
        svg=Some("<svg data-moonlight=\"1.0\"></svg>"),
        caption=Some("Sketch"),
      ),
    ],
    meta: None,
  }
  let markdown = document_to_markdown(doc)
  inspect(markdown.contains("```papyr-table"[:]), content="true")
  inspect(markdown.contains("\"caption\": \"Projects\""[:]), content="true")
  inspect(markdown.contains("```mermaid\ngraph TD; A-->B;"[:]), content="true")
  inspect(markdown.contains("```papyr-excalidraw"[:]), content="true")
  inspect(
    markdown.contains("\"svg\": \"<svg data-moonlight=\\\"1.0\\\"></svg>\""[:]),
    content="true",
  )
  inspect(markdown.contains("\"caption\": \"Sketch\""[:]), content="true")
}

///|
test "document json round trips through MoonBit API" {
  let doc = parse_markdown("# Intro", id="intro")
  let parsed = document_from_json(doc.to_json().stringify())
  inspect(parsed is Ok(_), content="true")
  @json.json_inspect(parsed.unwrap(), content={
    "id": "intro",
    "title": "Intro",
    "blocks": [
      [
        "Heading",
        {
          "id": "b1",
          "level": 1,
          "content": [{ "text": "Intro", "marks": [] }],
        },
      ],
    ],
  })
}
