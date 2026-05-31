///|
pub struct AuthoringToolEnvelope {
  ok : Bool
  tool : String
  snapshot : AuthoringSessionSnapshot?
  diagnostics : Array[AuthoringDiagnostic]
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct DocumentReadEnvelope {
  ok : Bool
  tool : String
  document : AuthoringDocumentRecord?
  diagnostics : Array[AuthoringDiagnostic]
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct DocumentsReadEnvelope {
  ok : Bool
  tool : String
  documents : Array[AuthoringDocumentRecord]
  diagnostics : Array[AuthoringDiagnostic]
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct WorkspacesReadEnvelope {
  ok : Bool
  tool : String
  workspace : AuthoringWorkspace
  workspaces : Array[WorkspaceSummary]
  diagnostics : Array[AuthoringDiagnostic]
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct PublicationsReadEnvelope {
  ok : Bool
  tool : String
  publications : Array[AuthoringPublicationRecord]
  diagnostics : Array[AuthoringDiagnostic]
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct PreviewReadEnvelope {
  ok : Bool
  tool : String
  preview : PreviewState
  diagnostics : Array[AuthoringDiagnostic]
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct SearchReadEnvelope {
  ok : Bool
  tool : String
  search : SearchState
  diagnostics : Array[AuthoringDiagnostic]
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct PublicationSearchEnvelope {
  ok : Bool
  tool : String
  query : String
  section : String
  limit : Int
  results : Array[AuthoringPublicationRecord]
  diagnostics : Array[AuthoringDiagnostic]
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct DiagnosticsReadEnvelope {
  ok : Bool
  tool : String
  diagnostics : Array[AuthoringDiagnostic]
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct PublishReadinessEnvelope {
  ok : Bool
  tool : String
  ready : Bool
  blocking_reasons : Array[String]
  diagnostics : Array[AuthoringDiagnostic]
} derive(Eq, ToJson, @json.FromJson)

///|
pub let app_server_artifact_schema_version : String = "papyr.app-server-artifact.v0"

///|
pub struct ApprovalProposal {
  kind : String
  approval_required : Bool
  summary : String
  workspace_id : String?
  target_endpoint : String?
  document_count : Int
  changed_document_ids : Array[String]
  document_id : String?
  publish_target : PublishTarget?
  snapshot : AuthoringSessionSnapshot
  diagnostics : Array[AuthoringDiagnostic]
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct ApprovalProposalEnvelope {
  ok : Bool
  tool : String
  proposal : ApprovalProposal?
  diagnostics : Array[AuthoringDiagnostic]
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct WorkspaceSourceBundle {
  workspace : AuthoringWorkspace
  documents : Array[AuthoringDocumentRecord]
  publications : Array[AuthoringPublicationRecord]
  selection : AuthoringSelectionState
  preview : PreviewState
  search : SearchState
  publish : PublishState
  exported_at : String
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct WorkspaceExportEnvelope {
  ok : Bool
  tool : String
  schema_version : String
  artifact_kind : String
  workspace_id : String
  generated_at : String
  bundle : WorkspaceSourceBundle?
  diagnostics : Array[AuthoringDiagnostic]
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct PublicationPayloadBundle {
  workspace_id : String
  publication : AuthoringPublicationRecord
  document : AuthoringDocumentRecord?
  target : PublishTarget?
  generated_at : String
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct PublicationPayloadEnvelope {
  ok : Bool
  tool : String
  schema_version : String
  artifact_kind : String
  workspace_id : String
  publication_id : String
  generated_at : String
  bundle : PublicationPayloadBundle?
  diagnostics : Array[AuthoringDiagnostic]
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct PreviewArtifactBundle {
  workspace_id : String
  preview : PreviewState
  document : AuthoringDocumentRecord?
  publication : AuthoringPublicationRecord?
  generated_at : String
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct PreviewArtifactEnvelope {
  ok : Bool
  tool : String
  schema_version : String
  artifact_kind : String
  workspace_id : String
  generated_at : String
  bundle : PreviewArtifactBundle?
  diagnostics : Array[AuthoringDiagnostic]
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct DiagnosticReportBundle {
  workspace_id : String
  diagnostics : Array[AuthoringDiagnostic]
  generated_at : String
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct DiagnosticReportEnvelope {
  ok : Bool
  tool : String
  schema_version : String
  artifact_kind : String
  workspace_id : String
  generated_at : String
  bundle : DiagnosticReportBundle?
  diagnostics : Array[AuthoringDiagnostic]
} derive(Eq, ToJson, @json.FromJson)

///|
fn empty_authoring_context() -> Map[String, Json] {
  Map::new()
}

///|
fn authoring_diagnostic(
  code : String,
  target : String,
  message : String,
  hint? : String? = None,
) -> AuthoringDiagnostic {
  {
    code,
    severity: "error",
    target,
    message,
    hint,
    context: empty_authoring_context(),
  }
}

///|
pub fn app_server_bridge_error(
  tool : String,
  message : String,
) -> AuthoringToolEnvelope {
  {
    ok: false,
    tool,
    snapshot: None,
    diagnostics: [authoring_diagnostic("bridge_error", "request", message)],
  }
}

///|
fn document_validation_diagnostics(
  diagnostics : Array[Diagnostic],
) -> Array[AuthoringDiagnostic] {
  let result : Array[AuthoringDiagnostic] = []
  for diagnostic in diagnostics {
    let context = empty_authoring_context()
    context["kind"] = diagnostic.kind.to_json()
    context["path"] = diagnostic.path.to_json()
    match diagnostic.expected {
      Some(expected) => context["expected"] = expected.to_json()
      None => ()
    }
    match diagnostic.received {
      Some(received) => context["received"] = received.to_json()
      None => ()
    }
    result.push({
      code: diagnostic.code,
      severity: "error",
      target: "document.\{diagnostic.path}",
      message: diagnostic.message,
      hint: Some("Fix the PapyrDocument JSON payload before saving."),
      context,
    })
  }
  result
}

///|
fn validate_optional_document_payload(
  document : PapyrDocument?,
) -> (PapyrDocument?, Array[AuthoringDiagnostic]) {
  match document {
    Some(value) => {
      let envelope = validate_papyr_document(value)
      if envelope.ok {
        (envelope.document, [])
      } else {
        (None, document_validation_diagnostics(envelope.diagnostics))
      }
    }
    None => (None, [])
  }
}

///|
fn last_action(
  name : String,
  at : String,
  status : String,
  summary : String,
) -> LastActionState {
  { name, at, status, summary }
}

///|
fn workspace_summary(
  workspace : AuthoringWorkspace,
  document_count : Int,
) -> WorkspaceSummary {
  {
    id: workspace.id,
    name: workspace.name,
    document_count,
    updated_at: workspace.updated_at,
  }
}

///|
fn refresh_workspace_summaries(
  snapshot : AuthoringSessionSnapshot,
) -> Array[WorkspaceSummary] {
  let summaries = []
  let mut found_current = false
  for summary in snapshot.workspace_summaries {
    if summary.id == snapshot.workspace.id {
      summaries.push(
        workspace_summary(snapshot.workspace, snapshot.documents.length()),
      )
      found_current = true
    } else {
      summaries.push(summary)
    }
  }
  if !found_current {
    summaries.push(
      workspace_summary(snapshot.workspace, snapshot.documents.length()),
    )
  }
  summaries
}

///|
fn recompute_publish_state(snapshot : AuthoringSessionSnapshot) -> PublishState {
  let reasons = []
  if snapshot.workspace.publish_target is None {
    reasons.push("publish target is not configured")
  }
  if snapshot.documents.length() == 0 {
    reasons.push("workspace has no documents")
  }
  {
    ready: reasons.length() == 0,
    blocking_reasons: reasons,
    target: snapshot.workspace.publish_target,
    last_result: snapshot.publish.last_result,
  }
}

///|
fn rebuild_snapshot(
  snapshot : AuthoringSessionSnapshot,
  workspace? : AuthoringWorkspace = snapshot.workspace,
  documents? : Array[AuthoringDocumentRecord] = snapshot.documents,
  publications? : Array[AuthoringPublicationRecord] = snapshot.publications,
  selection? : AuthoringSelectionState = snapshot.selection,
  preview? : PreviewState = snapshot.preview,
  search? : SearchState = snapshot.search,
  diagnostics? : Array[AuthoringDiagnostic] = snapshot.diagnostics,
  last_action? : LastActionState? = snapshot.last_action,
) -> AuthoringSessionSnapshot {
  let next = {
    schema_version: snapshot.schema_version,
    workspace,
    workspace_summaries: snapshot.workspace_summaries,
    documents,
    publications,
    selection,
    preview,
    search,
    publish: snapshot.publish,
    diagnostics,
    last_action,
  }
  let with_publish = {
    schema_version: next.schema_version,
    workspace: next.workspace,
    workspace_summaries: next.workspace_summaries,
    documents: next.documents,
    publications: next.publications,
    selection: next.selection,
    preview: next.preview,
    search: next.search,
    publish: recompute_publish_state(next),
    diagnostics: next.diagnostics,
    last_action: next.last_action,
  }
  {
    schema_version: with_publish.schema_version,
    workspace: with_publish.workspace,
    workspace_summaries: refresh_workspace_summaries(with_publish),
    documents: with_publish.documents,
    publications: with_publish.publications,
    selection: with_publish.selection,
    preview: with_publish.preview,
    search: with_publish.search,
    publish: with_publish.publish,
    diagnostics: with_publish.diagnostics,
    last_action: with_publish.last_action,
  }
}

///|
fn find_document(
  snapshot : AuthoringSessionSnapshot,
  document_id : String,
) -> AuthoringDocumentRecord? {
  for document in snapshot.documents {
    if document.id == document_id {
      return Some(document)
    }
  }
  None
}

///|
fn find_publication(
  snapshot : AuthoringSessionSnapshot,
  publication_id : String,
) -> AuthoringPublicationRecord? {
  for publication in snapshot.publications {
    if publication.id == publication_id {
      return Some(publication)
    }
  }
  None
}

///|
fn document_ids(snapshot : AuthoringSessionSnapshot) -> Array[String] {
  let ids = []
  for document in snapshot.documents {
    ids.push(document.id)
  }
  ids
}

///|
fn has_workspace(
  snapshot : AuthoringSessionSnapshot,
  workspace_id : String,
) -> Bool {
  if snapshot.workspace.id == workspace_id {
    return true
  }
  for summary in snapshot.workspace_summaries {
    if summary.id == workspace_id {
      return true
    }
  }
  false
}

///|
fn publication_matches_query(
  publication : AuthoringPublicationRecord,
  query : String,
) -> Bool {
  query == "" ||
  publication.title.contains(query[:]) ||
  publication.slug.contains(query[:]) ||
  publication.summary.contains(query[:])
}

///|
fn publication_matches_section(
  publication : AuthoringPublicationRecord,
  section : String,
) -> Bool {
  section == "all" || publication.section == section
}

///|
pub fn app_server_get_session_snapshot(
  snapshot : AuthoringSessionSnapshot,
) -> AuthoringToolEnvelope {
  {
    ok: true,
    tool: "get_session_snapshot",
    snapshot: Some(snapshot),
    diagnostics: [],
  }
}

///|
pub fn app_server_get_workspaces(
  snapshot : AuthoringSessionSnapshot,
) -> WorkspacesReadEnvelope {
  {
    ok: true,
    tool: "get_workspaces",
    workspace: snapshot.workspace,
    workspaces: snapshot.workspace_summaries,
    diagnostics: [],
  }
}

///|
pub fn app_server_get_publications(
  snapshot : AuthoringSessionSnapshot,
) -> PublicationsReadEnvelope {
  {
    ok: true,
    tool: "get_publications",
    publications: snapshot.publications,
    diagnostics: [],
  }
}

///|
pub fn app_server_get_documents(
  snapshot : AuthoringSessionSnapshot,
) -> DocumentsReadEnvelope {
  {
    ok: true,
    tool: "get_documents",
    documents: snapshot.documents,
    diagnostics: [],
  }
}

///|
pub fn app_server_get_document(
  snapshot : AuthoringSessionSnapshot,
  document_id : String,
) -> DocumentReadEnvelope {
  match find_document(snapshot, document_id) {
    Some(document) =>
      {
        ok: true,
        tool: "get_document",
        document: Some(document),
        diagnostics: [],
      }
    None => {
      let diagnostic = authoring_diagnostic(
        "document_not_found",
        "documents.\{document_id}",
        "Document \{document_id} was not found",
        hint=Some("Create the document first or refresh the session snapshot."),
      )
      {
        ok: false,
        tool: "get_document",
        document: None,
        diagnostics: [diagnostic],
      }
    }
  }
}

///|
pub fn app_server_get_preview(
  snapshot : AuthoringSessionSnapshot,
) -> PreviewReadEnvelope {
  { ok: true, tool: "get_preview", preview: snapshot.preview, diagnostics: [] }
}

///|
pub fn app_server_get_search(
  snapshot : AuthoringSessionSnapshot,
) -> SearchReadEnvelope {
  { ok: true, tool: "get_search", search: snapshot.search, diagnostics: [] }
}

///|
pub fn app_server_search_publications(
  snapshot : AuthoringSessionSnapshot,
  query? : String = snapshot.search.query,
  section? : String = snapshot.search.section,
  limit? : Int = snapshot.search.limit,
) -> PublicationSearchEnvelope {
  if limit <= 0 {
    let diagnostic = authoring_diagnostic(
      "invalid_search_limit", "search.limit", "Search limit must be greater than zero",
    )
    {
      ok: false,
      tool: "search_publications",
      query,
      section,
      limit,
      results: [],
      diagnostics: [diagnostic],
    }
  } else {
    let results = []
    for publication in snapshot.publications {
      if results.length() < limit &&
        publication_matches_section(publication, section) &&
        publication_matches_query(publication, query) {
        results.push(publication)
      }
    }
    {
      ok: true,
      tool: "search_publications",
      query,
      section,
      limit,
      results,
      diagnostics: [],
    }
  }
}

///|
pub fn app_server_get_diagnostics(
  snapshot : AuthoringSessionSnapshot,
) -> DiagnosticsReadEnvelope {
  { ok: true, tool: "get_diagnostics", diagnostics: snapshot.diagnostics }
}

///|
pub fn app_server_get_publish_readiness(
  snapshot : AuthoringSessionSnapshot,
) -> PublishReadinessEnvelope {
  let publish = recompute_publish_state(snapshot)
  {
    ok: true,
    tool: "get_publish_readiness",
    ready: publish.ready,
    blocking_reasons: publish.blocking_reasons,
    diagnostics: snapshot.diagnostics,
  }
}

///|
pub fn app_server_open_workspace(
  snapshot : AuthoringSessionSnapshot,
  workspace_id : String,
  at~ : String,
) -> AuthoringToolEnvelope {
  if has_workspace(snapshot, workspace_id) {
    let next = rebuild_snapshot(
      snapshot,
      selection={
        workspace_id,
        document_id: snapshot.selection.document_id,
        publication_id: snapshot.selection.publication_id,
        panel: "workspace",
      },
      last_action=Some(
        last_action(
          "open_workspace",
          at,
          "ok",
          "opened workspace \{workspace_id}",
        ),
      ),
    )
    { ok: true, tool: "open_workspace", snapshot: Some(next), diagnostics: [] }
  } else {
    let diagnostic = authoring_diagnostic(
      "workspace_not_found",
      "workspace.\{workspace_id}",
      "Workspace \{workspace_id} was not found",
    )
    {
      ok: false,
      tool: "open_workspace",
      snapshot: Some(rebuild_snapshot(snapshot, diagnostics=[diagnostic])),
      diagnostics: [diagnostic],
    }
  }
}

///|
pub fn app_server_rename_workspace(
  snapshot : AuthoringSessionSnapshot,
  name : String,
  at~ : String,
) -> AuthoringToolEnvelope {
  if name == "" {
    let diagnostic = authoring_diagnostic(
      "invalid_workspace_name", "workspace.name", "Workspace name cannot be empty",
    )
    {
      ok: false,
      tool: "rename_workspace",
      snapshot: Some(rebuild_snapshot(snapshot, diagnostics=[diagnostic])),
      diagnostics: [diagnostic],
    }
  } else {
    let workspace = {
      id: snapshot.workspace.id,
      name,
      updated_at: at,
      publish_target: snapshot.workspace.publish_target,
    }
    let next = rebuild_snapshot(
      snapshot,
      workspace~,
      last_action=Some(
        last_action("rename_workspace", at, "ok", "renamed workspace"),
      ),
    )
    {
      ok: true,
      tool: "rename_workspace",
      snapshot: Some(next),
      diagnostics: [],
    }
  }
}

///|
pub fn app_server_create_document(
  snapshot : AuthoringSessionSnapshot,
  document_id : String,
  title : String,
  kind : String,
  source : String,
  document? : PapyrDocument? = None,
  at~ : String,
) -> AuthoringToolEnvelope {
  if find_document(snapshot, document_id) is Some(_) {
    let diagnostic = authoring_diagnostic(
      "document_already_exists",
      "documents.\{document_id}",
      "Document \{document_id} already exists",
    )
    {
      ok: false,
      tool: "create_document",
      snapshot: Some(rebuild_snapshot(snapshot, diagnostics=[diagnostic])),
      diagnostics: [diagnostic],
    }
  } else {
    let (validated_document, validation_diagnostics) = validate_optional_document_payload(
      document,
    )
    if validation_diagnostics.length() > 0 {
      return {
        ok: false,
        tool: "create_document",
        snapshot: Some(
          rebuild_snapshot(snapshot, diagnostics=validation_diagnostics),
        ),
        diagnostics: validation_diagnostics,
      }
    }
    let documents = []
    for existing in snapshot.documents {
      documents.push(existing)
    }
    documents.push({
      id: document_id,
      title,
      kind,
      source,
      updated_at: at,
      document: validated_document,
    })
    let next = rebuild_snapshot(
      snapshot,
      documents~,
      selection={
        workspace_id: snapshot.workspace.id,
        document_id: Some(document_id),
        publication_id: snapshot.selection.publication_id,
        panel: "editor",
      },
      last_action=Some(
        last_action(
          "create_document",
          at,
          "ok",
          "created document \{document_id}",
        ),
      ),
    )
    { ok: true, tool: "create_document", snapshot: Some(next), diagnostics: [] }
  }
}

///|
pub fn app_server_update_document(
  snapshot : AuthoringSessionSnapshot,
  document_id : String,
  title? : String? = None,
  kind? : String? = None,
  source? : String? = None,
  document? : PapyrDocument? = None,
  clear_document? : Bool = false,
  at~ : String,
) -> AuthoringToolEnvelope {
  let documents = []
  let mut found = false
  for existing in snapshot.documents {
    if existing.id == document_id {
      found = true
      let mut validated_document = document
      if !clear_document {
        let (validated, validation_diagnostics) = validate_optional_document_payload(
          document,
        )
        if validation_diagnostics.length() > 0 {
          return {
            ok: false,
            tool: "update_document",
            snapshot: Some(
              rebuild_snapshot(snapshot, diagnostics=validation_diagnostics),
            ),
            diagnostics: validation_diagnostics,
          }
        }
        validated_document = validated
      }
      documents.push({
        id: existing.id,
        title: title.unwrap_or(existing.title),
        kind: kind.unwrap_or(existing.kind),
        source: source.unwrap_or(existing.source),
        updated_at: at,
        document: if clear_document {
          None
        } else {
          match validated_document {
            Some(value) => Some(value)
            None => existing.document
          }
        },
      })
    } else {
      documents.push(existing)
    }
  }
  if found {
    let next = rebuild_snapshot(
      snapshot,
      documents~,
      selection={
        workspace_id: snapshot.workspace.id,
        document_id: Some(document_id),
        publication_id: snapshot.selection.publication_id,
        panel: "editor",
      },
      last_action=Some(
        last_action(
          "update_document",
          at,
          "ok",
          "updated document \{document_id}",
        ),
      ),
    )
    { ok: true, tool: "update_document", snapshot: Some(next), diagnostics: [] }
  } else {
    let diagnostic = authoring_diagnostic(
      "document_not_found",
      "documents.\{document_id}",
      "Document \{document_id} was not found",
    )
    {
      ok: false,
      tool: "update_document",
      snapshot: Some(rebuild_snapshot(snapshot, diagnostics=[diagnostic])),
      diagnostics: [diagnostic],
    }
  }
}

///|
pub fn app_server_delete_document(
  snapshot : AuthoringSessionSnapshot,
  document_id : String,
) -> ApprovalProposalEnvelope {
  match find_document(snapshot, document_id) {
    Some(_) =>
      {
        ok: true,
        tool: "delete_document",
        proposal: Some({
          kind: "delete_document",
          approval_required: true,
          summary: "Delete document \{document_id}",
          workspace_id: Some(snapshot.workspace.id),
          target_endpoint: None,
          document_count: snapshot.documents.length(),
          changed_document_ids: [document_id],
          document_id: Some(document_id),
          publish_target: None,
          snapshot,
          diagnostics: [],
        }),
        diagnostics: [],
      }
    None => {
      let diagnostic = authoring_diagnostic(
        "document_not_found",
        "documents.\{document_id}",
        "Document \{document_id} was not found",
      )
      {
        ok: false,
        tool: "delete_document",
        proposal: None,
        diagnostics: [diagnostic],
      }
    }
  }
}

///|
pub fn app_server_set_preview_route(
  snapshot : AuthoringSessionSnapshot,
  route : PreviewRoute,
  mode? : String = snapshot.preview.mode,
  at~ : String,
) -> AuthoringToolEnvelope {
  let next = rebuild_snapshot(
    snapshot,
    preview={ route, mode },
    last_action=Some(
      last_action("set_preview_route", at, "ok", "changed preview route"),
    ),
  )
  { ok: true, tool: "set_preview_route", snapshot: Some(next), diagnostics: [] }
}

///|
pub fn app_server_set_search_state(
  snapshot : AuthoringSessionSnapshot,
  query : String,
  section? : String = snapshot.search.section,
  limit? : Int = snapshot.search.limit,
  at~ : String,
) -> AuthoringToolEnvelope {
  if limit <= 0 {
    let diagnostic = authoring_diagnostic(
      "invalid_search_limit", "search.limit", "Search limit must be greater than zero",
    )
    {
      ok: false,
      tool: "set_search_state",
      snapshot: Some(rebuild_snapshot(snapshot, diagnostics=[diagnostic])),
      diagnostics: [diagnostic],
    }
  } else {
    let next = rebuild_snapshot(
      snapshot,
      search={ query, section, limit },
      last_action=Some(
        last_action("set_search_state", at, "ok", "changed search state"),
      ),
    )
    {
      ok: true,
      tool: "set_search_state",
      snapshot: Some(next),
      diagnostics: [],
    }
  }
}

///|
pub fn app_server_set_publish_target(
  snapshot : AuthoringSessionSnapshot,
  target : PublishTarget?,
  at~ : String,
) -> AuthoringToolEnvelope {
  let workspace = {
    id: snapshot.workspace.id,
    name: snapshot.workspace.name,
    updated_at: at,
    publish_target: target,
  }
  let next = rebuild_snapshot(
    snapshot,
    workspace~,
    last_action=Some(
      last_action("set_publish_target", at, "ok", "changed publish target"),
    ),
  )
  {
    ok: true,
    tool: "set_publish_target",
    snapshot: Some(next),
    diagnostics: [],
  }
}

///|
pub fn app_server_publish_workspace(
  snapshot : AuthoringSessionSnapshot,
) -> ApprovalProposalEnvelope {
  let publish = recompute_publish_state(snapshot)
  if publish.ready {
    let target = snapshot.workspace.publish_target.unwrap()
    {
      ok: true,
      tool: "publish_workspace",
      proposal: Some({
        kind: "publish_workspace",
        approval_required: true,
        summary: "Publish \{snapshot.documents.length()} document(s) from workspace \{snapshot.workspace.id} to \{target.endpoint}",
        workspace_id: Some(snapshot.workspace.id),
        target_endpoint: Some(target.endpoint),
        document_count: snapshot.documents.length(),
        changed_document_ids: document_ids(snapshot),
        document_id: None,
        publish_target: Some(target),
        snapshot,
        diagnostics: [],
      }),
      diagnostics: [],
    }
  } else {
    let diagnostic = authoring_diagnostic(
      "publish_not_ready",
      "publish",
      "Workspace is not ready to publish",
      hint=Some(publish.blocking_reasons.join(", ")),
    )
    {
      ok: false,
      tool: "publish_workspace",
      proposal: None,
      diagnostics: [diagnostic],
    }
  }
}

///|
pub fn app_server_export_workspace_source(
  snapshot : AuthoringSessionSnapshot,
  at~ : String,
) -> WorkspaceExportEnvelope {
  {
    ok: true,
    tool: "export_workspace_source",
    schema_version: app_server_artifact_schema_version,
    artifact_kind: "workspace_source",
    workspace_id: snapshot.workspace.id,
    generated_at: at,
    bundle: Some({
      workspace: snapshot.workspace,
      documents: snapshot.documents,
      publications: snapshot.publications,
      selection: snapshot.selection,
      preview: snapshot.preview,
      search: snapshot.search,
      publish: recompute_publish_state(snapshot),
      exported_at: at,
    }),
    diagnostics: [],
  }
}

///|
pub fn app_server_export_publication_payload(
  snapshot : AuthoringSessionSnapshot,
  publication_id : String,
  at~ : String,
) -> PublicationPayloadEnvelope {
  match find_publication(snapshot, publication_id) {
    Some(publication) =>
      {
        ok: true,
        tool: "export_publication_payload",
        schema_version: app_server_artifact_schema_version,
        artifact_kind: "publication_payload",
        workspace_id: snapshot.workspace.id,
        publication_id,
        generated_at: at,
        bundle: Some({
          workspace_id: snapshot.workspace.id,
          publication,
          document: find_document(snapshot, publication.document_id),
          target: snapshot.workspace.publish_target,
          generated_at: at,
        }),
        diagnostics: [],
      }
    None => {
      let diagnostic = authoring_diagnostic(
        "publication_not_found",
        "publications.\{publication_id}",
        "Publication \{publication_id} was not found",
      )
      {
        ok: false,
        tool: "export_publication_payload",
        schema_version: app_server_artifact_schema_version,
        artifact_kind: "publication_payload",
        workspace_id: snapshot.workspace.id,
        publication_id,
        generated_at: at,
        bundle: None,
        diagnostics: [diagnostic],
      }
    }
  }
}

///|
pub fn app_server_export_preview_artifact(
  snapshot : AuthoringSessionSnapshot,
  at~ : String,
) -> PreviewArtifactEnvelope {
  let document = match snapshot.selection.document_id {
    Some(document_id) => find_document(snapshot, document_id)
    None => None
  }
  let publication = match snapshot.selection.publication_id {
    Some(publication_id) => find_publication(snapshot, publication_id)
    None => None
  }
  {
    ok: true,
    tool: "export_preview_artifact",
    schema_version: app_server_artifact_schema_version,
    artifact_kind: "preview_artifact",
    workspace_id: snapshot.workspace.id,
    generated_at: at,
    bundle: Some({
      workspace_id: snapshot.workspace.id,
      preview: snapshot.preview,
      document,
      publication,
      generated_at: at,
    }),
    diagnostics: [],
  }
}

///|
pub fn app_server_export_diagnostic_report(
  snapshot : AuthoringSessionSnapshot,
  at~ : String,
) -> DiagnosticReportEnvelope {
  {
    ok: true,
    tool: "export_diagnostic_report",
    schema_version: app_server_artifact_schema_version,
    artifact_kind: "diagnostic_report",
    workspace_id: snapshot.workspace.id,
    generated_at: at,
    bundle: Some({
      workspace_id: snapshot.workspace.id,
      diagnostics: snapshot.diagnostics,
      generated_at: at,
    }),
    diagnostics: [],
  }
}
