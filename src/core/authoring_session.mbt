///|
pub let authoring_session_store_version : String = "papyr.authoring-session.v0"

///|
pub struct AuthoringWorkspace {
  id : String
  name : String
  updated_at : String
  publish_target : PublishTarget?
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct PublishTarget {
  endpoint : String
  workspace_id : String
  token_ref : String?
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct WorkspaceSummary {
  id : String
  name : String
  document_count : Int
  updated_at : String
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct AuthoringDocumentRecord {
  id : String
  title : String
  kind : String
  source : String
  updated_at : String
  document : PapyrDocument?
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct AuthoringPublicationRecord {
  id : String
  document_id : String
  title : String
  kind : String
  section : String
  slug : String
  summary : String
  published : Bool
  href : String
  topics : Array[String]
  updated_at : String?
  book_id : String?
  chapter_order : Int?
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct AuthoringSelectionState {
  workspace_id : String
  document_id : String?
  publication_id : String?
  panel : String
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct PreviewRoute {
  name : String
  slug : String?
  book_slug : String?
  chapter_slug : String?
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct PreviewState {
  route : PreviewRoute
  mode : String
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct SearchState {
  query : String
  section : String
  limit : Int
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct PublishResult {
  published_document_count : Int
  site_url : String?
  updated_at : String
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct PublishState {
  ready : Bool
  blocking_reasons : Array[String]
  target : PublishTarget?
  last_result : PublishResult?
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct AuthoringDiagnostic {
  code : String
  severity : String
  target : String
  message : String
  hint : String?
  context : Map[String, Json]
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct LastActionState {
  name : String
  at : String
  status : String
  summary : String
} derive(Eq, ToJson, @json.FromJson)

///|
pub struct AuthoringSessionSnapshot {
  schema_version : String
  workspace : AuthoringWorkspace
  workspace_summaries : Array[WorkspaceSummary]
  documents : Array[AuthoringDocumentRecord]
  publications : Array[AuthoringPublicationRecord]
  selection : AuthoringSelectionState
  preview : PreviewState
  search : SearchState
  publish : PublishState
  diagnostics : Array[AuthoringDiagnostic]
  last_action : LastActionState?
} derive(Eq, ToJson, @json.FromJson)

///|
pub fn AuthoringSessionSnapshot::to_store_json(
  self : AuthoringSessionSnapshot,
) -> String {
  self.to_json().stringify(indent=2)
}

///|
pub fn resume_authoring_session_snapshot(
  source : String,
) -> Result[AuthoringSessionSnapshot, Array[Diagnostic]] {
  try {
    let json = @json.parse(source)
    let snapshot : AuthoringSessionSnapshot = @json.from_json(json)
    if snapshot.schema_version == authoring_session_store_version {
      Ok(snapshot)
    } else {
      Err([
        invalid_value(
          "schema_version",
          authoring_session_store_version,
          snapshot.schema_version,
        ),
      ])
    }
  } catch {
    e => Err([parse_error("Invalid authoring session snapshot: \{e}")])
  }
}

///|
pub fn new_authoring_session_snapshot(
  workspace : AuthoringWorkspace,
  generated_at~ : String,
) -> AuthoringSessionSnapshot {
  let publish_blocking_reasons = match workspace.publish_target {
    Some(_) => []
    None => ["publish target is not configured"]
  }
  {
    schema_version: authoring_session_store_version,
    workspace,
    workspace_summaries: [
      {
        id: workspace.id,
        name: workspace.name,
        document_count: 0,
        updated_at: workspace.updated_at,
      },
    ],
    documents: [],
    publications: [],
    selection: {
      workspace_id: workspace.id,
      document_id: None,
      publication_id: None,
      panel: "workspace-list",
    },
    preview: {
      route: { name: "home", slug: None, book_slug: None, chapter_slug: None, },
      mode: "document",
    },
    search: { query: "", section: "all", limit: 20, },
    publish: {
      ready: false,
      blocking_reasons: publish_blocking_reasons,
      target: workspace.publish_target,
      last_result: None,
    },
    diagnostics: [],
    last_action: Some({
      name: "create_workspace",
      at: generated_at,
      status: "ok",
      summary: "created local authoring workspace",
    }),
  }
}
