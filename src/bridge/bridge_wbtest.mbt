///|
let bridge_doc_json = "{\"id\":\"intro\",\"title\":\"Intro\",\"blocks\":[[\"Heading\",{\"id\":\"h1\",\"level\":1,\"content\":[{\"text\":\"Intro\",\"marks\":[]}]}],[\"Paragraph\",{\"id\":\"p1\",\"content\":[{\"text\":\"Searchable body\",\"marks\":[]}]}]]}"

///|
test "document tool bridge dispatches markdown to document" {
  let result = papyr_document_tool_json(
    "{\"tool\":\"markdown_to_document\",\"input\":{\"markdown\":\"# Intro\",\"id\":\"intro\"}}",
  )
  inspect(result.contains("\"ok\":true"), content="true")
  inspect(result.contains("\"tool\":\"markdown_to_document\""), content="true")
  inspect(result.contains("[\"Heading\""), content="true")
}

///|
test "document tool bridge dispatches document to markdown" {
  let result = papyr_document_tool_json(
    "{\"tool\":\"document_to_markdown\",\"input\":{\"document\":" +
    bridge_doc_json +
    "}}",
  )
  inspect(result.contains("\"ok\":true"), content="true")
  inspect(result.contains("\"tool\":\"document_to_markdown\""), content="true")
  inspect(result.contains("\"markdown\":\"# Intro"), content="true")
}

///|
test "document tool bridge dispatches validate and format" {
  let validated = papyr_document_tool_json(
    "{\"tool\":\"validate_document\",\"input\":{\"document\":" +
    bridge_doc_json +
    "}}",
  )
  inspect(validated.contains("\"ok\":true"), content="true")
  inspect(validated.contains("\"tool\":\"validate_document\""), content="true")
  let formatted = papyr_document_tool_json(
    "{\"tool\":\"format_markdown\",\"input\":{\"markdown\":\"# Intro\\n\\nBody\"}}",
  )
  inspect(formatted.contains("\"ok\":true"), content="true")
  inspect(formatted.contains("\"tool\":\"format_markdown\""), content="true")
  inspect(formatted.contains("\"markdown\":\"# Intro"), content="true")
}

///|
test "document tool bridge dispatches preview and search" {
  let previewed = papyr_document_tool_json(
    "{\"tool\":\"preview_document\",\"input\":{\"document\":" +
    bridge_doc_json +
    ",\"mode\":\"document\"}}",
  )
  inspect(previewed.contains("\"ok\":true"), content="true")
  inspect(previewed.contains("\"tool\":\"preview_document\""), content="true")
  inspect(previewed.contains("\"document_id\":\"intro\""), content="true")
  let searched = papyr_document_tool_json(
    "{\"tool\":\"search_documents\",\"input\":{\"documents\":[" +
    bridge_doc_json +
    "],\"query\":\"body\",\"limit\":5}}",
  )
  inspect(searched.contains("\"ok\":true"), content="true")
  inspect(searched.contains("\"tool\":\"search_documents\""), content="true")
  inspect(searched.contains("\"total\":1"), content="true")
}

///|
test "document tool bridge dispatches export tools" {
  let workspace = papyr_document_tool_json(
    "{\"tool\":\"export_workspace\",\"input\":{\"documents\":[" +
    bridge_doc_json +
    "],\"generated_at\":\"2026-05-23T00:00:00Z\"}}",
  )
  inspect(workspace.contains("\"ok\":true"), content="true")
  inspect(workspace.contains("\"tool\":\"export_workspace\""), content="true")
  inspect(
    workspace.contains("\"schema_version\":\"papyr.document-stack.v0\""),
    content="true",
  )
  let publication = papyr_document_tool_json(
    "{\"tool\":\"export_publication\",\"input\":{\"documents\":[" +
    bridge_doc_json +
    "],\"publication_id\":\"intro\",\"generated_at\":\"2026-05-23T00:00:00Z\"}}",
  )
  inspect(publication.contains("\"ok\":true"), content="true")
  inspect(
    publication.contains("\"tool\":\"export_publication\""),
    content="true",
  )
  inspect(publication.contains("\"publication_id\":\"intro\""), content="true")
}

///|
test "document tool bridge exports all-in-one Papyr bundle" {
  let result = papyr_document_tool_json(
    "{\"tool\":\"export_papyr_bundle\",\"input\":{\"documents\":[" +
    bridge_doc_json +
    "],\"generated_at\":\"2026-05-25T00:00:00Z\"}}",
  )
  inspect(result.contains("\"ok\":true"), content="true")
  inspect(result.contains("\"tool\":\"export_papyr_bundle\""), content="true")
  inspect(result.contains("\"artifact_kind\":\"papyr_bundle\""), content="true")
  inspect(result.contains("\"markdown_mirrors\""), content="true")
  inspect(result.contains("\"markdown\":\"# Intro"), content="true")
  inspect(result.contains("\"preview_html\""), content="true")
  inspect(result.contains("\"slides\""), content="true")
}

///|
test "PDF layout bridge resolves typed layout JSON" {
  let request : PdfLayoutResolveInput = {
    document: {
      id: "pdf-layout",
      title: "PDF Layout",
      pages: {
        first: {
          id: "page-1",
          size: { width: 595, height: 842 },
          nodes: [
            @core.PdfLayoutNode::PdfLayoutText({
              frame: {
                id: "title",
                rect: { x: 32, y: 32, width: 180, height: 24 },
                visible_when: None,
                locked: false,
              },
              source: @core.PdfTextSource::PdfBoundText("title"),
              style: @core.pdf_layout_default_text_style(),
            }),
          ],
        },
        rest: [],
      },
    },
    data: Some({
      text_values: [{ key: "title", value: "Invoice" }],
      image_values: [],
      number_values: [],
      bool_values: [],
      data_lists: [],
    }),
    mode: Some("editor"),
  }
  let result = papyr_resolve_pdf_layout_json(request.to_json().stringify())
  inspect(result.contains("\"ok\":true"), content="true")
  inspect(result.contains("\"document_id\":\"pdf-layout\""), content="true")
  inspect(result.contains("\"node_type\":\"text\""), content="true")
  inspect(result.contains("\"Invoice\""), content="true")
}

///|
test "search bridge extracts indexable document and snippets" {
  let indexable = papyr_search_to_indexable_json(
    "{\"document\":" + bridge_doc_json + "}",
  )
  inspect(indexable.contains("\"ok\":true"), content="true")
  inspect(
    indexable.contains("\"tool\":\"search_to_indexable_json\""),
    content="true",
  )
  inspect(indexable.contains("\"headings\":\"Intro\""), content="true")
  inspect(indexable.contains("\"kind\":\"heading\""), content="true")
  let snippet = papyr_search_extract_snippet_json(
    "{\"text\":\"Hello searchable world\",\"query\":\"SEARCHABLE\",\"context\":6}",
  )
  inspect(snippet.contains("\"ok\":true"), content="true")
  inspect(snippet.contains("\"snippet\""), content="true")
  inspect(snippet.contains("searchable"), content="true")
}

///|
test "document tool bridge reports unsupported tool" {
  let result = papyr_document_tool_json("{\"tool\":\"missing\",\"input\":{}}")
  inspect(result.contains("\"ok\":false"), content="true")
  inspect(result.contains("\"code\":\"bridge_error\""), content="true")
}
