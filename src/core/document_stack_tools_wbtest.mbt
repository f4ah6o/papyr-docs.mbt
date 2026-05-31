///|
fn stack_tool_doc() -> PapyrDocument {
  {
    id: "intro",
    title: Some("Intro"),
    blocks: [
      Block::Heading(id="h1", level=1, content=[
        { text: "Intro", marks: [], href: None },
      ]),
      Block::Paragraph(id="p1", content=[
        { text: "Searchable body", marks: [], href: None },
      ]),
    ],
    meta: None,
  }
}

///|
fn stack_tool_operations_doc() -> PapyrDocument {
  {
    id: "ops/runbook",
    title: Some("Operations Runbook"),
    blocks: [
      Block::Heading(id="h1", level=1, content=[
        { text: "Operations Runbook", marks: [], href: None },
      ]),
      Block::Paragraph(id="p1", content=[
        { text: "Escalation checklist", marks: [], href: None },
      ]),
    ],
    meta: Some(
      Json::object({
        "workspace": "Engineering".to_json(),
        "workspace_id": "eng-prod".to_json(),
        "space": "SRE".to_json(),
        "folder": "Runbooks/Incidents".to_json(),
        "status": "published".to_json(),
        "tags": ["runbook", "incident"].to_json(),
        "history_notes": ["imported from esa runbooks"].to_json(),
        "attachments": ["incident-playbook.pdf"].to_json(),
      }),
    ),
  }
}

///|
test "document stack preview renders validated PapyrDocument" {
  let preview = document_stack_preview_document(stack_tool_doc())
  inspect(preview.ok, content="true")
  inspect(preview.tool, content="preview_document")
  let rendered = preview.result.unwrap().stringify()
  inspect(rendered.contains("\"document_id\":\"intro\""), content="true")
  inspect(rendered.contains("<h1 id=\\\"h1\\\">Intro</h1>"), content="true")
}

///|
test "document stack search returns matching documents" {
  let searched = document_stack_search_documents(
    [stack_tool_doc()],
    "body",
    limit=10,
  )
  inspect(searched.ok, content="true")
  inspect(searched.tool, content="search_documents")
  let rendered = searched.result.unwrap().stringify()
  inspect(rendered.contains("\"total\":1"), content="true")
  inspect(rendered.contains("\"id\":\"intro\""), content="true")
}

///|
test "document stack search v2 indexes operational metadata" {
  let searched = document_stack_search_documents(
    [stack_tool_operations_doc()],
    "incident",
    limit=10,
  )
  inspect(searched.ok, content="true")
  inspect(searched.tool, content="search_documents")
  let rendered = searched.result.unwrap().stringify()
  inspect(rendered.contains("\"total\":1"), content="true")
  inspect(rendered.contains("\"id\":\"ops/runbook\""), content="true")
  inspect(
    rendered.contains("\"folder\":\"Runbooks/Incidents\""),
    content="true",
  )
  inspect(
    rendered.contains("\"tags\":[\"runbook\",\"incident\"]"),
    content="true",
  )
  inspect(
    rendered.contains(
      "\"matched_fields\":[\"folder\",\"tags\",\"attachments\"]",
    ),
    content="true",
  )
}

///|
test "document stack search v2 reports workspace id matches distinctly" {
  let searched = document_stack_search_documents(
    [stack_tool_operations_doc()],
    "eng-prod",
    limit=10,
  )
  inspect(searched.ok, content="true")
  let rendered = searched.result.unwrap().stringify()
  inspect(
    rendered.contains("\"matched_fields\":[\"workspace_id\"]"),
    content="true",
  )
}

///|
test "document stack search ranks tags above body matches" {
  let body_match : PapyrDocument = {
    id: "body",
    title: Some("Body Match"),
    blocks: [
      Block::Paragraph(id="p1", content=[
        { text: "runbook appears only in body", marks: [], href: None },
      ]),
    ],
    meta: None,
  }
  let searched = document_stack_search_documents(
    [body_match, stack_tool_operations_doc()],
    "runbook",
    limit=10,
  )
  inspect(searched.ok, content="true")
  let rendered = searched.result.unwrap().stringify()
  inspect(rendered.contains("\"total\":2"), content="true")
  inspect(
    rendered.contains("\"hits\":[{\"id\":\"ops/runbook\""),
    content="true",
  )
}

///|
test "document stack search empty query preserves input order" {
  let searched = document_stack_search_documents(
    [stack_tool_operations_doc(), stack_tool_doc()],
    "",
    limit=10,
  )
  inspect(searched.ok, content="true")
  let rendered = searched.result.unwrap().stringify()
  inspect(rendered.contains("\"total\":2"), content="true")
  inspect(
    rendered.contains("\"hits\":[{\"id\":\"ops/runbook\""),
    content="true",
  )
  inspect(rendered.contains("\"matched_fields\":[]"), content="true")
}

///|
test "document stack export publication reports missing document" {
  let exported = document_stack_export_publication(
    [stack_tool_doc()],
    "missing",
    generated_at="2026-05-22T00:00:00Z",
  )
  inspect(exported.ok, content="false")
  inspect(exported.tool, content="export_publication")
  inspect(exported.diagnostics[0].code, content="publication_not_found")
}

///|
test "document stack export workspace keeps PapyrDocument tuple JSON" {
  let exported = document_stack_export_workspace(
    [stack_tool_doc()],
    generated_at="2026-05-22T00:00:00Z",
  )
  inspect(exported.ok, content="true")
  inspect(exported.tool, content="export_workspace")
  let rendered = exported.result.unwrap().stringify()
  inspect(
    rendered.contains("\"schema_version\":\"papyr.document-stack.v0\""),
    content="true",
  )
  inspect(rendered.contains("[\"Heading\""), content="true")
}

///|
test "document stack exports all-in-one Papyr bundle" {
  let doc : PapyrDocument = {
    id: "deck",
    title: Some("Deck"),
    blocks: [
      Block::Heading(id="h1", level=1, content=[
        { text: "Deck", marks: [], href: None },
      ]),
      Block::Paragraph(id="p1", content=[
        { text: "Intro", marks: [], href: None },
      ]),
      Block::Heading(id="h2-a", level=2, content=[
        { text: "Section A", marks: [], href: None },
      ]),
      Block::Paragraph(id="p2", content=[
        { text: "A body", marks: [], href: None },
      ]),
      Block::Heading(id="h2-b", level=2, content=[
        { text: "Section B", marks: [], href: None },
      ]),
    ],
    meta: None,
  }
  let exported = document_stack_export_papyr_bundle(
    [doc],
    [{ document_id: "deck", markdown: "# Deck" }],
    generated_at="2026-05-25T00:00:00Z",
  )
  inspect(exported.ok, content="true")
  inspect(exported.tool, content="export_papyr_bundle")
  let rendered = exported.result.unwrap().stringify()
  inspect(
    rendered.contains("\"artifact_kind\":\"papyr_bundle\""),
    content="true",
  )
  inspect(
    rendered.contains("\"generated_at\":\"2026-05-25T00:00:00Z\""),
    content="true",
  )
  inspect(rendered.contains("\"markdown_mirrors\""), content="true")
  inspect(rendered.contains("\"preview_html\""), content="true")
  inspect(rendered.contains("\"slides\""), content="true")
  inspect(rendered.contains("\"slide_number\":3"), content="true")
  inspect(rendered.contains("\"title\":\"Section B\""), content="true")
  inspect(
    rendered.contains("<article class=\\\"papyr-preview\\\""),
    content="true",
  )
}

///|
test "document stack rejects mismatched markdown mirrors" {
  let exported = document_stack_export_papyr_bundle(
    [stack_tool_doc()],
    [{ document_id: "missing", markdown: "# Intro" }],
    generated_at="2026-05-25T00:00:00Z",
  )
  inspect(exported.ok, content="false")
  inspect(
    exported.diagnostics[0].code,
    content="markdown_mirror_document_mismatch",
  )
}
