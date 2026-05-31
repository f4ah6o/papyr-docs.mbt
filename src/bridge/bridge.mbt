///|
struct MarkdownParseRequest {
  markdown : String
  id : String?
} derive(@json.FromJson)

///|
struct AuthoringToolRequest {
  tool : String
  snapshot : @core.AuthoringSessionSnapshot
  input : Json?
  at : String?
} derive(@json.FromJson)

///|
struct CreateDocumentInput {
  id : String
  title : String
  kind : String
  source : String
  document : @core.PapyrDocument?
} derive(@json.FromJson)

///|
struct UpdateDocumentInput {
  id : String
  title : String?
  kind : String?
  source : String?
  document : @core.PapyrDocument?
  clear_document : Bool?
} derive(@json.FromJson)

///|
struct DocumentIdInput {
  id : String
} derive(@json.FromJson)

///|
struct DocumentStackToolRequest {
  tool : String
  input : Json?
  at : String?
} derive(@json.FromJson)

///|
struct ValidateDocumentInput {
  document : @core.PapyrDocument
} derive(@json.FromJson)

///|
struct DocumentUtilityInput {
  document : @core.PapyrDocument
} derive(@json.FromJson)

///|
struct SearchBlockTextInput {
  block : @core.Block
} derive(@json.FromJson)

///|
struct SearchSnippetInput {
  text : String
  query : String
  context : Int?
} derive(@json.FromJson)

///|
struct DocumentBlockOperationInput {
  document : @core.PapyrDocument
  block_id : String
  block : @core.Block?
} derive(@json.FromJson)

///|
struct MarkdownToDocumentInput {
  markdown : String
  id : String?
} derive(@json.FromJson)

///|
struct DocumentToMarkdownInput {
  document : @core.PapyrDocument
} derive(@json.FromJson)

///|
struct FormatMarkdownInput {
  markdown : String
} derive(@json.FromJson)

///|
struct PreviewDocumentInput {
  document : @core.PapyrDocument
  mode : String?
} derive(@json.FromJson)

///|
struct PdfLayoutResolveInput {
  document : @core.PdfLayoutDocument
  data : @core.PdfLayoutData?
  mode : String?
} derive(ToJson, @json.FromJson)

///|
struct SearchDocumentsInput {
  documents : Array[@core.PapyrDocument]
  query : String
  limit : Int?
} derive(@json.FromJson)

///|
struct ExportPublicationInput {
  documents : Array[@core.PapyrDocument]
  publication_id : String
  generated_at : String?
} derive(@json.FromJson)

///|
struct ExportWorkspaceInput {
  documents : Array[@core.PapyrDocument]
  generated_at : String?
} derive(@json.FromJson)

///|
struct ExportPapyrBundleInput {
  documents : Array[@core.PapyrDocument]
  generated_at : String?
} derive(@json.FromJson)

///|
struct RelationListChapterIdsInput {
  book_id : String
  state : @relation.PublicationTreeState
} derive(@json.FromJson)

///|
struct SerializeDocumentEnvelope {
  ok : Bool
  tool : String
  markdown : String
  diagnostics : Array[@core.Diagnostic]
} derive(ToJson)

///|
fn document_bridge_diagnostic(message : String) -> @core.Diagnostic {
  {
    kind: "parse",
    code: "bridge_error",
    path: "",
    message,
    expected: Some("valid bridge request"),
    received: Some("invalid request"),
  }
}

///|
fn document_bridge_error(tool : String, message : String) -> String {
  let envelope : @core.PapyrDocumentEnvelope = {
    ok: false,
    tool,
    document: None,
    diagnostics: [document_bridge_diagnostic(message)],
  }
  envelope.to_json().stringify()
}

///|
fn serialize_bridge_error(tool : String, message : String) -> String {
  let envelope : SerializeDocumentEnvelope = {
    ok: false,
    tool,
    markdown: "",
    diagnostics: [document_bridge_diagnostic(message)],
  }
  envelope.to_json().stringify()
}

///|
fn authoring_bridge_error(tool : String, message : String) -> String {
  @core.app_server_bridge_error(tool, message).to_json().stringify()
}

///|
fn document_stack_bridge_error(tool : String, message : String) -> String {
  @core.document_stack_error(
    tool,
    "bridge_error",
    "request",
    message,
    expected=Some("valid document stack tool request"),
    received=Some("invalid request"),
  )
  .to_json()
  .stringify()
}

///|
fn tool_input_json(request : DocumentStackToolRequest) -> Json {
  request.input.unwrap_or(Json::object(Map::new()))
}

///|
fn markdown_result(tool : String, markdown : String) -> String {
  let result : Map[String, Json] = { "markdown": markdown.to_json() }
  @core.document_stack_success(tool, Json::object(result)).to_json().stringify()
}

///|
fn markdown_mirrors(
  documents : Array[@core.PapyrDocument],
) -> Array[@core.DocumentMarkdownMirror] {
  let mirrors : Array[@core.DocumentMarkdownMirror] = []
  for document in documents {
    mirrors.push({
      document_id: document.id,
      markdown: @markdown.document_to_markdown(document),
    })
  }
  mirrors
}

///|
pub fn papyr_validate_document_json(source : String) -> String {
  @core.parse_papyr_document_json(source).to_json().stringify()
}

///|
pub fn papyr_relation_sort_raw_json(source : String) -> String {
  try {
    let input : Array[@relation.RawRelation] = @json.from_json(
      @json.parse(source),
    )
    @relation.sort_raw_relations(input).to_json().stringify()
  } catch {
    e => Json::string("Invalid relation sort raw request: \{e}").stringify()
  }
}

///|
pub fn papyr_relation_sort_resolved_json(source : String) -> String {
  try {
    let input : Array[@relation.ResolvedRelation] = @json.from_json(
      @json.parse(source),
    )
    @relation.sort_resolved_relations(input).to_json().stringify()
  } catch {
    e =>
      Json::string("Invalid relation sort resolved request: \{e}").stringify()
  }
}

///|
pub fn papyr_relation_dedupe_raw_json(source : String) -> String {
  try {
    let input : Array[@relation.RawRelation] = @json.from_json(
      @json.parse(source),
    )
    @relation.dedupe_raw_relations(input).to_json().stringify()
  } catch {
    e => Json::string("Invalid relation dedupe raw request: \{e}").stringify()
  }
}

///|
pub fn papyr_relation_dedupe_resolved_json(source : String) -> String {
  try {
    let input : Array[@relation.ResolvedRelation] = @json.from_json(
      @json.parse(source),
    )
    @relation.dedupe_resolved_relations(input).to_json().stringify()
  } catch {
    e =>
      Json::string("Invalid relation dedupe resolved request: \{e}").stringify()
  }
}

///|
pub fn papyr_relation_check_json(source : String) -> String {
  try {
    let input : @relation.CheckRelationsOptions = @json.from_json(
      @json.parse(source),
    )
    @relation.check_relations(input).to_json().stringify()
  } catch {
    e => Json::string("Invalid relation check request: \{e}").stringify()
  }
}

///|
pub fn papyr_relation_resolve_json(source : String) -> String {
  try {
    let input : @relation.ResolveRelationsOptions = @json.from_json(
      @json.parse(source),
    )
    @relation.resolve_relations(input).to_json().stringify()
  } catch {
    e => Json::string("Invalid relation resolve request: \{e}").stringify()
  }
}

///|
pub fn papyr_relation_project_tree_json(source : String) -> String {
  try {
    let input : @relation.ProjectRelationOptions = @json.from_json(
      @json.parse(source),
    )
    @relation.project_tree(input).to_json().stringify()
  } catch {
    e => Json::string("Invalid relation project tree request: \{e}").stringify()
  }
}

///|
pub fn papyr_relation_project_backlinks_json(source : String) -> String {
  try {
    let input : @relation.ProjectRelationOptions = @json.from_json(
      @json.parse(source),
    )
    @relation.project_backlinks(input).to_json().stringify()
  } catch {
    e =>
      Json::string("Invalid relation project backlinks request: \{e}").stringify()
  }
}

///|
pub fn papyr_relation_project_graph_json(source : String) -> String {
  try {
    let input : Array[@relation.ResolvedRelation] = @json.from_json(
      @json.parse(source),
    )
    @relation.project_graph(input).to_json().stringify()
  } catch {
    e =>
      Json::string("Invalid relation project graph request: \{e}").stringify()
  }
}

///|
pub fn papyr_relation_build_publication_tree_state_json(
  source : String,
) -> String {
  try {
    let input : @relation.BuildPublicationTreeStateOptions = @json.from_json(
      @json.parse(source),
    )
    @relation.build_publication_tree_state(input).to_json().stringify()
  } catch {
    e =>
      Json::string("Invalid relation publication tree request: \{e}").stringify()
  }
}

///|
pub fn papyr_relation_list_chapter_ids_for_book_json(source : String) -> String {
  try {
    let input : RelationListChapterIdsInput = @json.from_json(
      @json.parse(source),
    )
    @relation.list_chapter_ids_for_book(input.book_id, input.state)
    .to_json()
    .stringify()
  } catch {
    e => Json::string("Invalid relation chapter list request: \{e}").stringify()
  }
}

///|
pub fn papyr_relation_format_diagnostic_json(source : String) -> String {
  try {
    let input : @relation.PublicationTreeDiagnostic = @json.from_json(
      @json.parse(source),
    )
    @relation.format_relation_diagnostic(input).to_json().stringify()
  } catch {
    e =>
      Json::string("Invalid relation diagnostic format request: \{e}").stringify()
  }
}

///|
pub fn papyr_document_title_json(source : String) -> String {
  try {
    let input : DocumentUtilityInput = @json.from_json(@json.parse(source))
    @core.document_stack_success(
      "document_title_json",
      @core.document_title(input.document).to_json(),
    )
    .to_json()
    .stringify()
  } catch {
    e =>
      document_stack_bridge_error(
        "document_title_json",
        "Invalid document title request: \{e}",
      )
  }
}

///|
pub fn papyr_document_plain_text_json(source : String) -> String {
  try {
    let input : DocumentUtilityInput = @json.from_json(@json.parse(source))
    @core.document_stack_success(
      "document_plain_text_json",
      @core.document_text(input.document).to_json(),
    )
    .to_json()
    .stringify()
  } catch {
    e =>
      document_stack_bridge_error(
        "document_plain_text_json",
        "Invalid document plain text request: \{e}",
      )
  }
}

///|
pub fn papyr_search_block_text_json(source : String) -> String {
  try {
    let input : SearchBlockTextInput = @json.from_json(@json.parse(source))
    @core.document_stack_success(
      "search_block_text_json",
      @search.search_block_text(input.block).to_json(),
    )
    .to_json()
    .stringify()
  } catch {
    e =>
      document_stack_bridge_error(
        "search_block_text_json",
        "Invalid search block text request: \{e}",
      )
  }
}

///|
pub fn papyr_search_to_indexable_json(source : String) -> String {
  try {
    let input : DocumentUtilityInput = @json.from_json(@json.parse(source))
    @core.document_stack_success(
      "search_to_indexable_json",
      @search.search_to_indexable(input.document).to_json(),
    )
    .to_json()
    .stringify()
  } catch {
    e =>
      document_stack_bridge_error(
        "search_to_indexable_json",
        "Invalid search to indexable request: \{e}",
      )
  }
}

///|
pub fn papyr_search_extract_snippet_json(source : String) -> String {
  try {
    let input : SearchSnippetInput = @json.from_json(@json.parse(source))
    @core.document_stack_success(
      "search_extract_snippet_json",
      @search.search_extract_snippet_request({
        text: input.text,
        query: input.query,
        context: input.context,
      }).to_json(),
    )
    .to_json()
    .stringify()
  } catch {
    e =>
      document_stack_bridge_error(
        "search_extract_snippet_json",
        "Invalid search extract snippet request: \{e}",
      )
  }
}

///|
pub fn papyr_collect_document_headings_json(source : String) -> String {
  try {
    let input : DocumentUtilityInput = @json.from_json(@json.parse(source))
    @core.document_stack_success(
      "collect_document_headings_json",
      @core.collect_document_headings(input.document).to_json(),
    )
    .to_json()
    .stringify()
  } catch {
    e =>
      document_stack_bridge_error(
        "collect_document_headings_json",
        "Invalid collect document headings request: \{e}",
      )
  }
}

///|
pub fn papyr_visit_document_blocks_json(source : String) -> String {
  try {
    let input : DocumentUtilityInput = @json.from_json(@json.parse(source))
    @core.document_stack_success(
      "visit_document_blocks_json",
      @core.visit_document_blocks(input.document).to_json(),
    )
    .to_json()
    .stringify()
  } catch {
    e =>
      document_stack_bridge_error(
        "visit_document_blocks_json",
        "Invalid visit document blocks request: \{e}",
      )
  }
}

///|
pub fn papyr_replace_document_block_json(source : String) -> String {
  try {
    let input : DocumentBlockOperationInput = @json.from_json(
      @json.parse(source),
    )
    match input.block {
      Some(block) =>
        @core.document_stack_success(
          "replace_document_block_json",
          @core.replace_document_block(input.document, input.block_id, block).to_json(),
        )
        .to_json()
        .stringify()
      None =>
        document_stack_bridge_error(
          "replace_document_block_json", "Missing replacement block",
        )
    }
  } catch {
    e =>
      document_stack_bridge_error(
        "replace_document_block_json",
        "Invalid replace document block request: \{e}",
      )
  }
}

///|
pub fn papyr_insert_document_block_after_json(source : String) -> String {
  try {
    let input : DocumentBlockOperationInput = @json.from_json(
      @json.parse(source),
    )
    match input.block {
      Some(block) =>
        @core.document_stack_success(
          "insert_document_block_after_json",
          @core.insert_document_block_after(
            input.document,
            input.block_id,
            block,
          ).to_json(),
        )
        .to_json()
        .stringify()
      None =>
        document_stack_bridge_error(
          "insert_document_block_after_json", "Missing inserted block",
        )
    }
  } catch {
    e =>
      document_stack_bridge_error(
        "insert_document_block_after_json",
        "Invalid insert document block request: \{e}",
      )
  }
}

///|
pub fn papyr_remove_document_block_json(source : String) -> String {
  try {
    let input : DocumentBlockOperationInput = @json.from_json(
      @json.parse(source),
    )
    @core.document_stack_success(
      "remove_document_block_json",
      @core.remove_document_block(input.document, input.block_id).to_json(),
    )
    .to_json()
    .stringify()
  } catch {
    e =>
      document_stack_bridge_error(
        "remove_document_block_json",
        "Invalid remove document block request: \{e}",
      )
  }
}

///|
pub fn papyr_resolve_pdf_layout_json(source : String) -> String {
  try {
    let input : PdfLayoutResolveInput = @json.from_json(@json.parse(source))
    @core.resolve_pdf_layout_document(
      input.document,
      input.data.unwrap_or(@core.pdf_layout_empty_data()),
      @core.pdf_layout_resolve_mode_from_string(input.mode.unwrap_or("pdf")),
    )
    .to_json()
    .stringify()
  } catch {
    e =>
      @core.pdf_layout_resolve_error("Invalid PDF layout resolve request: \{e}")
      .to_json()
      .stringify()
  }
}

///|
pub fn papyr_parse_markdown_json(source : String) -> String {
  try {
    let request : MarkdownParseRequest = @json.from_json(@json.parse(source))
    @core.validate_papyr_document(
      @markdown.parse_markdown(
        request.markdown,
        id=request.id.unwrap_or("untitled"),
      ),
    )
    .to_json()
    .stringify()
  } catch {
    e =>
      document_bridge_error(
        "parse_markdown_json",
        "Invalid parse markdown request: \{e}",
      )
  }
}

///|
pub fn papyr_serialize_document_json(source : String) -> String {
  match @markdown.document_from_json(source) {
    Ok(doc) => {
      let envelope : SerializeDocumentEnvelope = {
        ok: true,
        tool: "serialize_document_json",
        markdown: @markdown.document_to_markdown(doc),
        diagnostics: [],
      }
      envelope.to_json().stringify()
    }
    Err(message) => serialize_bridge_error("serialize_document_json", message)
  }
}

///|
pub fn papyr_document_tool_json(source : String) -> String {
  try {
    let request : DocumentStackToolRequest = @json.from_json(
      @json.parse(source),
    )
    match request.tool {
      "validate_document" => {
        let input : ValidateDocumentInput = @json.from_json(
          tool_input_json(request),
        )
        @core.document_stack_validate_document(input.document)
        .to_json()
        .stringify()
      }
      "markdown_to_document" => {
        let input : MarkdownToDocumentInput = @json.from_json(
          tool_input_json(request),
        )
        let document = @markdown.parse_markdown(
          input.markdown,
          id=input.id.unwrap_or("untitled"),
        )
        let envelope = @core.validate_papyr_document(document)
        if envelope.ok {
          @core.document_stack_success(
            "markdown_to_document",
            document.to_json(),
          )
          .to_json()
          .stringify()
        } else {
          @core.document_stack_failure(
            "markdown_to_document",
            envelope.diagnostics,
          )
          .to_json()
          .stringify()
        }
      }
      "document_to_markdown" => {
        let input : DocumentToMarkdownInput = @json.from_json(
          tool_input_json(request),
        )
        let envelope = @core.validate_papyr_document(input.document)
        if envelope.ok {
          markdown_result(
            "document_to_markdown",
            @markdown.document_to_markdown(input.document),
          )
        } else {
          @core.document_stack_failure(
            "document_to_markdown",
            envelope.diagnostics,
          )
          .to_json()
          .stringify()
        }
      }
      "format_markdown" => {
        let input : FormatMarkdownInput = @json.from_json(
          tool_input_json(request),
        )
        markdown_result(
          "format_markdown",
          @formatter.format_markdown(input.markdown),
        )
      }
      "preview_document" => {
        let input : PreviewDocumentInput = @json.from_json(
          tool_input_json(request),
        )
        @core.document_stack_preview_document(
          input.document,
          mode=input.mode.unwrap_or("document"),
        )
        .to_json()
        .stringify()
      }
      "search_documents" => {
        let input : SearchDocumentsInput = @json.from_json(
          tool_input_json(request),
        )
        @core.document_stack_search_documents(
          input.documents,
          input.query,
          limit=input.limit.unwrap_or(20),
        )
        .to_json()
        .stringify()
      }
      "export_publication" => {
        let input : ExportPublicationInput = @json.from_json(
          tool_input_json(request),
        )
        let generated_at = match input.generated_at {
          Some(value) => value
          None => request.at.unwrap_or("")
        }
        @core.document_stack_export_publication(
          input.documents,
          input.publication_id,
          generated_at~,
        )
        .to_json()
        .stringify()
      }
      "export_workspace" => {
        let input : ExportWorkspaceInput = @json.from_json(
          tool_input_json(request),
        )
        let generated_at = match input.generated_at {
          Some(value) => value
          None => request.at.unwrap_or("")
        }
        @core.document_stack_export_workspace(input.documents, generated_at~)
        .to_json()
        .stringify()
      }
      "export_papyr_bundle" => {
        let input : ExportPapyrBundleInput = @json.from_json(
          tool_input_json(request),
        )
        let generated_at = match input.generated_at {
          Some(value) => value
          None => request.at.unwrap_or("")
        }
        @core.document_stack_export_papyr_bundle(
          input.documents,
          markdown_mirrors(input.documents),
          generated_at~,
        )
        .to_json()
        .stringify()
      }
      _ =>
        document_stack_bridge_error(
          request.tool,
          "Unsupported document stack tool: \{request.tool}",
        )
    }
  } catch {
    e =>
      document_stack_bridge_error(
        "document_tool_json",
        "Invalid document stack tool request: \{e}",
      )
  }
}

///|
pub fn papyr_authoring_tool_json(source : String) -> String {
  try {
    let request : AuthoringToolRequest = @json.from_json(@json.parse(source))
    let at = request.at.unwrap_or("")
    match request.tool {
      "get_session_snapshot" =>
        @core.app_server_get_session_snapshot(request.snapshot)
        .to_json()
        .stringify()
      "get_documents" =>
        @core.app_server_get_documents(request.snapshot).to_json().stringify()
      "get_document" => {
        let input : DocumentIdInput = @json.from_json(
          request.input.unwrap_or(Json::object(Map::new())),
        )
        @core.app_server_get_document(request.snapshot, input.id)
        .to_json()
        .stringify()
      }
      "create_document" => {
        let input : CreateDocumentInput = @json.from_json(
          request.input.unwrap_or(Json::object(Map::new())),
        )
        @core.app_server_create_document(
          request.snapshot,
          input.id,
          input.title,
          input.kind,
          input.source,
          document=input.document,
          at~,
        )
        .to_json()
        .stringify()
      }
      "update_document" => {
        let input : UpdateDocumentInput = @json.from_json(
          request.input.unwrap_or(Json::object(Map::new())),
        )
        @core.app_server_update_document(
          request.snapshot,
          input.id,
          title=input.title,
          kind=input.kind,
          source=input.source,
          document=input.document,
          clear_document=input.clear_document.unwrap_or(false),
          at~,
        )
        .to_json()
        .stringify()
      }
      _ =>
        authoring_bridge_error(
          request.tool,
          "Unsupported authoring tool: \{request.tool}",
        )
    }
  } catch {
    e =>
      authoring_bridge_error(
        "authoring_tool_json",
        "Invalid authoring tool request: \{e}",
      )
  }
}
