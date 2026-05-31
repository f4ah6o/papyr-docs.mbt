///|
pub struct DocumentStackToolEnvelope {
  ok : Bool
  tool : String
  result : Json?
  diagnostics : Array[Diagnostic]
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct DocumentPreviewResult {
  document_id : String
  title : String
  mode : String
  text : String
  html : String
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct DocumentSearchHit {
  id : String
  title : String
  score : Int
  snippet : String
  matched_fields : Array[String]
  folder : String?
  tags : Array[String]
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct DocumentSearchResult {
  query : String
  total : Int
  hits : Array[DocumentSearchHit]
} derive(Eq, ToJson, @json.FromJson)

///|
struct DocumentSearchMetadata {
  workspace : String?
  workspace_id : String?
  space : String?
  notebook : String?
  folder : String?
  tags : Array[String]?
  history_notes : Array[String]?
  attachments : Array[String]?
} derive(Eq, ToJson, @json.FromJson)

///|
struct SearchField {
  name : String
  text : String
  weight : Int
} derive(Eq)

///|
pub struct DocumentWorkspaceExport {
  schema_version : String
  exported_at : String
  documents : Array[PapyrDocument]
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct DocumentPublicationExport {
  schema_version : String
  exported_at : String
  publication_id : String
  document : PapyrDocument
} derive(Eq, ToJson, @json.FromJson)

///|
pub(all) struct DocumentMarkdownMirror {
  document_id : String
  markdown : String
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct DocumentPreviewHtml {
  document_id : String
  title : String
  mode : String
  html : String
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct DocumentSlideArtifact {
  document_id : String
  slide_id : String
  slide_number : Int
  title : String
  document : PapyrDocument
  html : String
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct PapyrBundleExport {
  schema_version : String
  artifact_kind : String
  generated_at : String
  documents : Array[PapyrDocument]
  markdown_mirrors : Array[DocumentMarkdownMirror]
  preview_html : Array[DocumentPreviewHtml]
  slides : Array[DocumentSlideArtifact]
} derive(Eq, ToJson, @json.FromJson)

///|
pub let document_stack_schema_version : String = "papyr.document-stack.v0"

///|
pub let papyr_bundle_artifact_kind : String = "papyr_bundle"

///|
pub fn document_stack_success(
  tool : String,
  result : Json,
) -> DocumentStackToolEnvelope {
  { ok: true, tool, result: Some(result), diagnostics: [] }
}

///|
pub fn document_stack_failure(
  tool : String,
  diagnostics : Array[Diagnostic],
) -> DocumentStackToolEnvelope {
  { ok: false, tool, result: None, diagnostics }
}

///|
pub fn document_stack_error(
  tool : String,
  code : String,
  path : String,
  message : String,
  expected? : String? = None,
  received? : String? = None,
) -> DocumentStackToolEnvelope {
  document_stack_failure(tool, [
    { kind: "tool", code, path, message, expected, received },
  ])
}

///|
pub fn document_stack_validate_document(
  document : PapyrDocument,
) -> DocumentStackToolEnvelope {
  let envelope = validate_papyr_document(document)
  if envelope.ok {
    document_stack_success("validate_document", document.to_json())
  } else {
    document_stack_failure("validate_document", envelope.diagnostics)
  }
}

///|
pub fn document_stack_preview_document(
  document : PapyrDocument,
  mode? : String = "document",
) -> DocumentStackToolEnvelope {
  let envelope = validate_papyr_document(document)
  if !envelope.ok {
    return document_stack_failure("preview_document", envelope.diagnostics)
  }
  document_stack_success(
    "preview_document",
    {
      document_id: document.id,
      title: document_title(document),
      mode,
      text: document_text(document),
      html: render_document_html(document, mode),
    }.to_json(),
  )
}

///|
pub fn document_stack_search_documents(
  documents : Array[PapyrDocument],
  query : String,
  limit? : Int = 20,
) -> DocumentStackToolEnvelope {
  if limit <= 0 {
    return document_stack_error(
      "search_documents",
      "invalid_limit",
      "limit",
      "Search limit must be greater than zero",
      expected=Some("positive integer"),
      received=Some(limit.to_string()),
    )
  }
  let diagnostics : Array[Diagnostic] = []
  let hits : Array[DocumentSearchHit] = []
  let normalized_query = query.trim().to_owned().to_lower()
  for i, document in documents {
    let envelope = validate_papyr_document(document)
    if !envelope.ok {
      for diagnostic in envelope.diagnostics {
        diagnostics.push({
          kind: diagnostic.kind,
          code: diagnostic.code,
          path: path_join(index_path("documents", i), diagnostic.path),
          message: diagnostic.message,
          expected: diagnostic.expected,
          received: diagnostic.received,
        })
      }
      continue
    }
    let title = document_title(document)
    let body = document_text(document)
    let metadata = document_search_metadata(document)
    let fields = document_search_fields(title, body, metadata)
    let score = search_score(fields, normalized_query)
    if score > 0 || normalized_query == "" {
      hits.push({
        id: document.id,
        title,
        score,
        snippet: search_snippet(fields, title, normalized_query),
        matched_fields: search_matched_fields(fields, normalized_query),
        folder: metadata.folder,
        tags: metadata.tags.unwrap_or([]),
      })
    }
  }
  if diagnostics.length() > 0 {
    return document_stack_failure("search_documents", diagnostics)
  }
  if normalized_query != "" {
    hits.sort_by(compare_search_hit)
  }
  let limited : Array[DocumentSearchHit] = []
  for i, hit in hits {
    if i < limit {
      limited.push(hit)
    }
  }
  document_stack_success(
    "search_documents",
    { query, total: hits.length(), hits: limited }.to_json(),
  )
}

///|
pub fn document_stack_export_workspace(
  documents : Array[PapyrDocument],
  generated_at~ : String,
) -> DocumentStackToolEnvelope {
  let diagnostics : Array[Diagnostic] = []
  for i, document in documents {
    let envelope = validate_papyr_document(document)
    if !envelope.ok {
      for diagnostic in envelope.diagnostics {
        diagnostics.push({
          kind: diagnostic.kind,
          code: diagnostic.code,
          path: path_join(index_path("documents", i), diagnostic.path),
          message: diagnostic.message,
          expected: diagnostic.expected,
          received: diagnostic.received,
        })
      }
    }
  }
  if diagnostics.length() > 0 {
    return document_stack_failure("export_workspace", diagnostics)
  }
  document_stack_success(
    "export_workspace",
    {
      schema_version: document_stack_schema_version,
      exported_at: generated_at,
      documents,
    }.to_json(),
  )
}

///|
pub fn document_stack_export_publication(
  documents : Array[PapyrDocument],
  publication_id : String,
  generated_at~ : String,
) -> DocumentStackToolEnvelope {
  let workspace = document_stack_export_workspace(documents, generated_at~)
  if !workspace.ok {
    return {
      ok: false,
      tool: "export_publication",
      result: None,
      diagnostics: workspace.diagnostics,
    }
  }
  for document in documents {
    if document.id == publication_id {
      return document_stack_success(
        "export_publication",
        {
          schema_version: document_stack_schema_version,
          exported_at: generated_at,
          publication_id,
          document,
        }.to_json(),
      )
    }
  }
  document_stack_error(
    "export_publication",
    "publication_not_found",
    "publication_id",
    "Publication \{publication_id} was not found",
    expected=Some("document id present in documents"),
    received=Some(publication_id),
  )
}

///|
pub fn document_stack_export_papyr_bundle(
  documents : Array[PapyrDocument],
  markdown_mirrors : Array[DocumentMarkdownMirror],
  generated_at~ : String,
) -> DocumentStackToolEnvelope {
  let diagnostics = validate_documents_for_tool(
    documents, "export_papyr_bundle",
  )
  if diagnostics.length() > 0 {
    return document_stack_failure("export_papyr_bundle", diagnostics)
  }
  let mirror_diagnostics = validate_markdown_mirrors(
    documents, markdown_mirrors,
  )
  if mirror_diagnostics.length() > 0 {
    return document_stack_failure("export_papyr_bundle", mirror_diagnostics)
  }
  let preview_html : Array[DocumentPreviewHtml] = []
  let slides : Array[DocumentSlideArtifact] = []
  for document in documents {
    preview_html.push({
      document_id: document.id,
      title: document_title(document),
      mode: "document",
      html: render_document_html(document, "document"),
    })
    for slide in build_document_slides(document) {
      slides.push(slide)
    }
  }
  document_stack_success(
    "export_papyr_bundle",
    {
      schema_version: document_stack_schema_version,
      artifact_kind: papyr_bundle_artifact_kind,
      generated_at,
      documents,
      markdown_mirrors,
      preview_html,
      slides,
    }.to_json(),
  )
}

///|
fn validate_documents_for_tool(
  documents : Array[PapyrDocument],
  _tool : String,
) -> Array[Diagnostic] {
  let diagnostics : Array[Diagnostic] = []
  for i, document in documents {
    let envelope = validate_papyr_document(document)
    if !envelope.ok {
      for diagnostic in envelope.diagnostics {
        diagnostics.push({
          kind: diagnostic.kind,
          code: diagnostic.code,
          path: path_join(index_path("documents", i), diagnostic.path),
          message: diagnostic.message,
          expected: diagnostic.expected,
          received: diagnostic.received,
        })
      }
    }
  }
  diagnostics
}

///|
fn validate_markdown_mirrors(
  documents : Array[PapyrDocument],
  markdown_mirrors : Array[DocumentMarkdownMirror],
) -> Array[Diagnostic] {
  let diagnostics : Array[Diagnostic] = []
  if markdown_mirrors.length() != documents.length() {
    diagnostics.push({
      kind: "tool",
      code: "markdown_mirror_count_mismatch",
      path: "markdown_mirrors",
      message: "Markdown mirror count must match document count",
      expected: Some(documents.length().to_string()),
      received: Some(markdown_mirrors.length().to_string()),
    })
    return diagnostics
  }
  for i, document in documents {
    let mirror = markdown_mirrors[i]
    if mirror.document_id != document.id {
      diagnostics.push({
        kind: "tool",
        code: "markdown_mirror_document_mismatch",
        path: index_path("markdown_mirrors", i) + ".document_id",
        message: "Markdown mirror document id must match canonical document id",
        expected: Some(document.id),
        received: Some(mirror.document_id),
      })
    }
  }
  diagnostics
}

///|
fn build_document_slides(
  document : PapyrDocument,
) -> Array[DocumentSlideArtifact] {
  let slides : Array[DocumentSlideArtifact] = []
  let slide_blocks = split_document_into_slides(document.blocks)
  for i, blocks in slide_blocks {
    let slide_id = document.id + "#slide-\{i + 1}"
    let slide_document : PapyrDocument = {
      id: slide_id,
      title: Some(resolve_slide_title(document, blocks, i)),
      blocks,
      meta: document.meta,
    }
    slides.push({
      document_id: document.id,
      slide_id,
      slide_number: i + 1,
      title: slide_document.title.unwrap_or(slide_id),
      document: slide_document,
      html: render_document_html(slide_document, "slides"),
    })
  }
  slides
}

///|
fn split_document_into_slides(blocks : Array[Block]) -> Array[Array[Block]] {
  let slides : Array[Array[Block]] = []
  let mut current : Array[Block] = []
  for block in blocks {
    if is_slide_boundary(block) && current.length() > 0 {
      slides.push(current)
      current = [block]
    } else {
      current.push(block)
    }
  }
  if current.length() > 0 {
    slides.push(current)
  }
  if slides.length() == 0 {
    slides.push([])
  }
  slides
}

///|
fn is_slide_boundary(block : Block) -> Bool {
  match block {
    Heading(level=2, ..) => true
    _ => false
  }
}

///|
fn resolve_slide_title(
  document : PapyrDocument,
  blocks : Array[Block],
  index : Int,
) -> String {
  if blocks.length() > 0 {
    match blocks[0] {
      Heading(content~, ..) => {
        let title = document_inline_text(content).trim().to_owned()
        if title.length() > 0 {
          return title
        }
      }
      _ => ()
    }
  }
  if index == 0 {
    document_title(document)
  } else {
    "Slide \{index + 1}"
  }
}

///|
fn document_search_metadata(document : PapyrDocument) -> DocumentSearchMetadata {
  match document.meta {
    Some(meta) =>
      @json.from_json(meta) catch {
        _ => empty_document_search_metadata()
      }
    None => empty_document_search_metadata()
  }
}

///|
fn empty_document_search_metadata() -> DocumentSearchMetadata {
  {
    workspace: None,
    workspace_id: None,
    space: None,
    notebook: None,
    folder: None,
    tags: None,
    history_notes: None,
    attachments: None,
  }
}

///|
fn document_search_fields(
  title : String,
  body : String,
  metadata : DocumentSearchMetadata,
) -> Array[SearchField] {
  let fields : Array[SearchField] = []
  push_search_field(fields, "title", title, 8)
  push_search_field(fields, "body", body, 1)
  push_optional_search_field(fields, "workspace", metadata.workspace, 3)
  push_optional_search_field(fields, "workspace_id", metadata.workspace_id, 3)
  push_optional_search_field(fields, "space", metadata.space, 4)
  push_optional_search_field(fields, "notebook", metadata.notebook, 4)
  push_optional_search_field(fields, "folder", metadata.folder, 4)
  push_array_search_field(fields, "tags", metadata.tags, 6)
  push_array_search_field(fields, "history_notes", metadata.history_notes, 3)
  push_array_search_field(fields, "attachments", metadata.attachments, 2)
  fields
}

///|
fn push_optional_search_field(
  fields : Array[SearchField],
  name : String,
  text : String?,
  weight : Int,
) -> Unit {
  match text {
    Some(text) => push_search_field(fields, name, text, weight)
    None => ()
  }
}

///|
fn push_array_search_field(
  fields : Array[SearchField],
  name : String,
  values : Array[String]?,
  weight : Int,
) -> Unit {
  match values {
    Some(values) =>
      push_search_field(fields, name, join_with(values, " "), weight)
    None => ()
  }
}

///|
fn push_search_field(
  fields : Array[SearchField],
  name : String,
  text : String,
  weight : Int,
) -> Unit {
  let normalized = text.trim().to_owned()
  if normalized.length() > 0 {
    fields.push({ name, text: normalized, weight })
  }
}

///|
fn search_score(fields : Array[SearchField], query : String) -> Int {
  if query == "" {
    return 1
  }
  let mut score = 0
  for field in fields {
    if field.text.to_lower().contains(query[:]) {
      score += field.weight
    }
  }
  score
}

///|
fn search_matched_fields(
  fields : Array[SearchField],
  query : String,
) -> Array[String] {
  let matched : Array[String] = []
  if query == "" {
    return matched
  }
  for field in fields {
    if field.text.to_lower().contains(query[:]) &&
      !search_string_array_contains(matched, field.name) {
      matched.push(field.name)
    }
  }
  matched
}

///|
fn search_snippet(
  fields : Array[SearchField],
  title : String,
  query : String,
) -> String {
  if query == "" {
    return first_non_empty_field(fields, title)
  }
  for field in fields {
    if field.text.to_lower().contains(query[:]) {
      return field.text
    }
  }
  first_non_empty_field(fields, title)
}

///|
fn first_non_empty_field(
  fields : Array[SearchField],
  fallback : String,
) -> String {
  for field in fields {
    let text = field.text.trim().to_owned()
    if text.length() > 0 {
      return text
    }
  }
  fallback
}

///|
fn search_string_array_contains(
  values : Array[String],
  candidate : String,
) -> Bool {
  for value in values {
    if value == candidate {
      return true
    }
  }
  false
}

///|
fn compare_search_hit(
  left : DocumentSearchHit,
  right : DocumentSearchHit,
) -> Int {
  let by_score = right.score.compare(left.score)
  if by_score != 0 {
    return by_score
  }
  let by_title = left.title.compare(right.title)
  if by_title != 0 {
    return by_title
  }
  left.id.compare(right.id)
}

///|
fn render_document_html(document : PapyrDocument, mode : String) -> String {
  let sb = StringBuilder::new()
  sb.write_string("<article class=\"papyr-preview\" data-document-id=\"")
  sb.write_string(html_escape(document.id))
  sb.write_string("\" data-mode=\"")
  sb.write_string(html_escape(mode))
  sb.write_string("\">")
  for block in document.blocks {
    sb.write_string(render_block_html(block))
  }
  sb.write_string("</article>")
  sb.to_string()
}

///|
fn render_block_html(block : Block) -> String {
  match block {
    Heading(id~, level~, content~) => {
      let tag = "h\{level}"
      "<\{tag} id=\"\{html_escape(id)}\">" +
      render_inline_html(content) +
      "</\{tag}>"
    }
    Paragraph(id~, content~) =>
      "<p id=\"\{html_escape(id)}\">" + render_inline_html(content) + "</p>"
    List(id~, ordered~, items~) => {
      let tag = if ordered { "ol" } else { "ul" }
      let sb = StringBuilder::new()
      sb.write_string("<")
      sb.write_string(tag)
      sb.write_string(" id=\"")
      sb.write_string(html_escape(id))
      sb.write_string("\">")
      for item in items {
        sb.write_string("<li>")
        for child in item.blocks {
          sb.write_string(render_block_html(child))
        }
        sb.write_string("</li>")
      }
      sb.write_string("</")
      sb.write_string(tag)
      sb.write_string(">")
      sb.to_string()
    }
    Code(id~, language~, source~) => {
      let class_attr = match language {
        Some(language) => " class=\"language-\{html_escape(language)}\""
        None => ""
      }
      "<pre id=\"\{html_escape(id)}\"><code\{class_attr}>" +
      html_escape(source) +
      "</code></pre>"
    }
    Table(id~, ..) =>
      "<figure id=\"\{html_escape(id)}\" class=\"papyr-table-block\"></figure>"
    Mermaid(id~, source~, ..) =>
      "<pre id=\"\{html_escape(id)}\"><code class=\"language-mermaid\">" +
      html_escape(source) +
      "</code></pre>"
    Moonlight(id~, ..) =>
      "<figure id=\"\{html_escape(id)}\" class=\"papyr-moonlight\"></figure>"
    Excalidraw(id~, ..) =>
      "<figure id=\"\{html_escape(id)}\" class=\"papyr-excalidraw\"></figure>"
  }
}

///|
fn render_inline_html(runs : Array[InlineRun]) -> String {
  let sb = StringBuilder::new()
  for run in runs {
    let mut text = html_escape(run.text)
    for mark in run.marks {
      if mark == "bold" {
        text = "<strong>" + text + "</strong>"
      } else if mark == "italic" {
        text = "<em>" + text + "</em>"
      } else if mark == "code" {
        text = "<code>" + text + "</code>"
      } else if mark == "strike" {
        text = "<s>" + text + "</s>"
      }
    }
    match run.href {
      Some(href) =>
        sb.write_string(
          "<a href=\"" + html_escape(href) + "\">" + text + "</a>",
        )
      None => sb.write_string(text)
    }
  }
  sb.to_string()
}

///|
fn html_escape(source : String) -> String {
  let sb = StringBuilder::new()
  for ch in source {
    match ch {
      '&' => sb.write_string("&amp;")
      '<' => sb.write_string("&lt;")
      '>' => sb.write_string("&gt;")
      '"' => sb.write_string("&quot;")
      '\'' => sb.write_string("&#39;")
      _ => sb.write_char(ch)
    }
  }
  sb.to_string()
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
