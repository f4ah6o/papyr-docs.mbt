///|
fn sample_workspace() -> AuthoringWorkspace {
  {
    id: "visitor-docs-site",
    name: "Visitor docs site",
    updated_at: "2026-05-10T00:00:00Z",
    publish_target: Some({
      endpoint: "https://example.invalid/publish",
      workspace_id: "visitor-docs-site",
      token_ref: Some("local-secret:visitor-docs-site"),
    }),
  }
}

///|
test "authoring session snapshot has durable resume defaults" {
  let snapshot = new_authoring_session_snapshot(
    sample_workspace(),
    generated_at="2026-05-10T00:00:01Z",
  )
  @json.json_inspect(snapshot, content={
    "schema_version": "papyr.authoring-session.v0",
    "workspace": {
      "id": "visitor-docs-site",
      "name": "Visitor docs site",
      "updated_at": "2026-05-10T00:00:00Z",
      "publish_target": {
        "endpoint": "https://example.invalid/publish",
        "workspace_id": "visitor-docs-site",
        "token_ref": "local-secret:visitor-docs-site",
      },
    },
    "workspace_summaries": [
      {
        "id": "visitor-docs-site",
        "name": "Visitor docs site",
        "document_count": 0,
        "updated_at": "2026-05-10T00:00:00Z",
      },
    ],
    "documents": [],
    "publications": [],
    "selection": {
      "workspace_id": "visitor-docs-site",
      "panel": "workspace-list",
    },
    "preview": { "route": { "name": "home" }, "mode": "document" },
    "search": { "query": "", "section": "all", "limit": 20 },
    "publish": {
      "ready": false,
      "blocking_reasons": [],
      "target": {
        "endpoint": "https://example.invalid/publish",
        "workspace_id": "visitor-docs-site",
        "token_ref": "local-secret:visitor-docs-site",
      },
    },
    "diagnostics": [],
    "last_action": {
      "name": "create_workspace",
      "at": "2026-05-10T00:00:01Z",
      "status": "ok",
      "summary": "created local authoring workspace",
    },
  })
}

///|
test "authoring session snapshot round trips through store json" {
  let snapshot = new_authoring_session_snapshot(
    sample_workspace(),
    generated_at="2026-05-10T00:00:01Z",
  )
  let resumed = resume_authoring_session_snapshot(snapshot.to_store_json())
  inspect(resumed == Ok(snapshot), content="true")
}

///|
test "authoring session resume rejects version drift" {
  let bad =
    #|{"schema_version":"papyr.authoring-session.v999","workspace":{"id":"w","name":"W","updated_at":"2026-05-10T00:00:00Z","publish_target":null},"workspace_summaries":[],"documents":[],"publications":[],"selection":{"workspace_id":"w","document_id":null,"publication_id":null,"panel":"workspace-list"},"preview":{"route":{"name":"home","slug":null,"book_slug":null,"chapter_slug":null},"mode":"document"},"search":{"query":"","section":"all","limit":20},"publish":{"ready":false,"blocking_reasons":[],"target":null,"last_result":null},"diagnostics":[],"last_action":null}
  let result = resume_authoring_session_snapshot(bad)
  inspect(result is Err(_), content="true")
}

///|
test "authoring session resume rejects malformed json" {
  let result = resume_authoring_session_snapshot("not json")
  inspect(result is Err(_), content="true")
}
