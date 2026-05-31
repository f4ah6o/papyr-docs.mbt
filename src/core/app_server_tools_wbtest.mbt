///|
fn app_server_sample_workspace() -> AuthoringWorkspace {
  {
    id: "visitor-docs-site",
    name: "Visitor docs site",
    updated_at: "2026-05-10T00:00:00Z",
    publish_target: None,
  }
}

///|
fn app_server_sample_snapshot() -> AuthoringSessionSnapshot {
  new_authoring_session_snapshot(
    app_server_sample_workspace(),
    generated_at="2026-05-10T00:00:01Z",
  )
}

///|
fn papyr_doc(source : String) -> PapyrDocument raise {
  @json.from_json(try! @json.parse(source))
}

///|
fn app_server_publishable_workspace() -> AuthoringWorkspace {
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
fn app_server_publishable_snapshot() -> AuthoringSessionSnapshot {
  let snapshot = new_authoring_session_snapshot(
    app_server_publishable_workspace(),
    generated_at="2026-05-10T00:00:01Z",
  )
  rebuild_snapshot(
    snapshot,
    documents=[
      {
        id: "intro",
        title: "Intro",
        kind: "article",
        source: "# Intro",
        updated_at: "2026-05-10T00:01:00Z",
        document: None,
      },
      {
        id: "guide",
        title: "Guide",
        kind: "article",
        source: "# Guide",
        updated_at: "2026-05-10T00:02:00Z",
        document: None,
      },
    ],
    publications=[
      {
        id: "pub-intro",
        document_id: "intro",
        title: "Intro",
        kind: "article",
        section: "docs",
        slug: "intro",
        summary: "Start here",
        published: true,
        href: "/docs/intro",
        topics: ["getting-started"],
        updated_at: Some("2026-05-10T00:03:00Z"),
        book_id: None,
        chapter_order: None,
      },
    ],
    selection={
      workspace_id: "visitor-docs-site",
      document_id: Some("intro"),
      publication_id: Some("pub-intro"),
      panel: "preview",
    },
    preview={
      route: {
        name: "article",
        slug: Some("intro"),
        book_slug: None,
        chapter_slug: None,
      },
      mode: "published",
    },
  )
}

///|
test "app server tools create update and read document" {
  let created = app_server_create_document(
    app_server_sample_snapshot(),
    "intro",
    "Intro",
    "article",
    "# Intro",
    at="2026-05-10T00:01:00Z",
  )
  let snapshot = created.snapshot.unwrap()
  let updated = app_server_update_document(
    snapshot,
    "intro",
    title=Some("Updated intro"),
    source=Some("# Updated"),
    at="2026-05-10T00:02:00Z",
  )
  let updated_snapshot = updated.snapshot.unwrap()
  let read = app_server_get_document(updated_snapshot, "intro")
  @json.json_inspect(read, content={
    "ok": true,
    "tool": "get_document",
    "document": {
      "id": "intro",
      "title": "Updated intro",
      "kind": "article",
      "source": "# Updated",
      "updated_at": "2026-05-10T00:02:00Z",
    },
    "diagnostics": [],
  })
}

///|
test "app server update document can clear rendered document body" {
  let created = app_server_create_document(
    app_server_sample_snapshot(),
    "intro",
    "Intro",
    "article",
    "# Intro",
    document=Some(
      papyr_doc(
        "{\"id\":\"intro\",\"blocks\":[[\"Paragraph\",{\"id\":\"p1\",\"content\":[]}]]}",
      ),
    ),
    at="2026-05-10T00:01:00Z",
  )
  let cleared = app_server_update_document(
    created.snapshot.unwrap(),
    "intro",
    clear_document=true,
    at="2026-05-10T00:02:00Z",
  )
  let read = app_server_get_document(cleared.snapshot.unwrap(), "intro")
  @json.json_inspect(read.document.unwrap(), content={
    "id": "intro",
    "title": "Intro",
    "kind": "article",
    "source": "# Intro",
    "updated_at": "2026-05-10T00:02:00Z",
  })
}

///|
test "app server rejects invalid create document payload" {
  let invalid = papyr_doc(
    "{\"id\":\"\",\"blocks\":[[\"Heading\",{\"id\":\"h1\",\"level\":9,\"content\":[]}]]}",
  )
  let created = app_server_create_document(
    app_server_sample_snapshot(),
    "intro",
    "Intro",
    "article",
    "# Intro",
    document=Some(invalid),
    at="2026-05-10T00:01:00Z",
  )
  inspect(created.ok, content="false")
  inspect(created.diagnostics[0].code, content="invalid_value")
  inspect(created.snapshot.unwrap().documents.length(), content="0")
}

///|
test "app server rejects invalid update document payload without overwrite" {
  let valid_doc = papyr_doc(
    "{\"id\":\"intro\",\"blocks\":[[\"Paragraph\",{\"id\":\"p1\",\"content\":[]}]]}",
  )
  let invalid = papyr_doc(
    "{\"id\":\"intro\",\"blocks\":[[\"Paragraph\",{\"id\":\"p1\",\"content\":[{\"text\":\"docs\",\"marks\":[\"link\"]}]}]]}",
  )
  let created = app_server_create_document(
    app_server_sample_snapshot(),
    "intro",
    "Intro",
    "article",
    "# Intro",
    document=Some(valid_doc),
    at="2026-05-10T00:01:00Z",
  )
  let updated = app_server_update_document(
    created.snapshot.unwrap(),
    "intro",
    document=Some(invalid),
    at="2026-05-10T00:02:00Z",
  )
  let read = app_server_get_document(updated.snapshot.unwrap(), "intro")
  inspect(updated.ok, content="false")
  inspect(updated.diagnostics[0].code, content="missing_field")
  inspect(
    read.document.unwrap().document.unwrap().to_json().stringify(),
    content=valid_doc.to_json().stringify(),
  )
}

///|
test "app server tools return diagnostics for missing document update and read" {
  let updated = app_server_update_document(
    app_server_sample_snapshot(),
    "missing",
    source=Some("# Missing"),
    at="2026-05-10T00:02:00Z",
  )
  let read = app_server_get_document(app_server_sample_snapshot(), "missing")
  inspect(updated.ok, content="false")
  inspect(read.ok, content="false")
  inspect(read.diagnostics[0].code, content="document_not_found")
}

///|
test "app server successful mutations preserve session diagnostics" {
  let failed = app_server_update_document(
    app_server_sample_snapshot(),
    "missing",
    source=Some("# Missing"),
    at="2026-05-10T00:02:00Z",
  )
  let renamed = app_server_rename_workspace(
    failed.snapshot.unwrap(),
    "Visitor docs",
    at="2026-05-10T00:03:00Z",
  )
  inspect(renamed.ok, content="true")
  inspect(renamed.diagnostics.length(), content="0")
  inspect(
    renamed.snapshot.unwrap().diagnostics[0].code,
    content="document_not_found",
  )
}

///|
test "app server tools persist preview route change" {
  let changed = app_server_set_preview_route(
    app_server_sample_snapshot(),
    {
      name: "article",
      slug: Some("intro"),
      book_slug: None,
      chapter_slug: None,
    },
    mode="document",
    at="2026-05-10T00:03:00Z",
  )
  let snapshot = changed.snapshot.unwrap()
  @json.json_inspect(app_server_get_preview(snapshot), content={
    "ok": true,
    "tool": "get_preview",
    "preview": {
      "route": { "name": "article", "slug": "intro" },
      "mode": "document",
    },
    "diagnostics": [],
  })
}

///|
test "app server tools persist search state change" {
  let changed = app_server_set_search_state(
    app_server_sample_snapshot(),
    "routing",
    section="docs",
    limit=7,
    at="2026-05-10T00:04:00Z",
  )
  let snapshot = changed.snapshot.unwrap()
  @json.json_inspect(app_server_get_search(snapshot), content={
    "ok": true,
    "tool": "get_search",
    "search": { "query": "routing", "section": "docs", "limit": 7 },
    "diagnostics": [],
  })
}

///|
test "app server publish readiness fails without target and documents" {
  let readiness = app_server_get_publish_readiness(app_server_sample_snapshot())
  @json.json_inspect(readiness, content={
    "ok": true,
    "tool": "get_publish_readiness",
    "ready": false,
    "blocking_reasons": [
      "publish target is not configured", "workspace has no documents",
    ],
    "diagnostics": [],
  })
}

///|
test "app server delete document returns approval proposal" {
  let created = app_server_create_document(
    app_server_sample_snapshot(),
    "intro",
    "Intro",
    "article",
    "# Intro",
    at="2026-05-10T00:01:00Z",
  )
  let proposal = app_server_delete_document(created.snapshot.unwrap(), "intro")
  inspect(proposal.ok, content="true")
  inspect(proposal.proposal.unwrap().approval_required, content="true")
  inspect(proposal.proposal.unwrap().document_id.unwrap(), content="intro")
}

///|
test "app server publish workspace returns approval proposal with review fields" {
  let proposal = app_server_publish_workspace(app_server_publishable_snapshot())
  let review = proposal.proposal.unwrap()
  inspect(proposal.ok, content="true")
  inspect(proposal.tool, content="publish_workspace")
  inspect(review.kind, content="publish_workspace")
  inspect(review.approval_required, content="true")
  inspect(
    review.summary,
    content="Publish 2 document(s) from workspace visitor-docs-site to https://example.invalid/publish",
  )
  inspect(review.workspace_id.unwrap(), content="visitor-docs-site")
  inspect(
    review.target_endpoint.unwrap(),
    content="https://example.invalid/publish",
  )
  inspect(review.document_count, content="2")
  inspect(review.changed_document_ids.length(), content="2")
  inspect(review.changed_document_ids[0], content="intro")
  inspect(review.changed_document_ids[1], content="guide")
  inspect(
    review.publish_target.unwrap().endpoint,
    content="https://example.invalid/publish",
  )
}

///|
test "app server exports workspace source bundle envelope" {
  let exported = app_server_export_workspace_source(
    app_server_publishable_snapshot(),
    at="2026-05-10T00:04:00Z",
  )
  let bundle = exported.bundle.unwrap()
  inspect(exported.ok, content="true")
  inspect(exported.tool, content="export_workspace_source")
  inspect(exported.schema_version, content="papyr.app-server-artifact.v0")
  inspect(exported.artifact_kind, content="workspace_source")
  inspect(exported.workspace_id, content="visitor-docs-site")
  inspect(exported.generated_at, content="2026-05-10T00:04:00Z")
  inspect(bundle.workspace.id, content="visitor-docs-site")
  inspect(bundle.documents.length(), content="2")
  inspect(bundle.documents[0].id, content="intro")
  inspect(bundle.publications[0].id, content="pub-intro")
  inspect(bundle.preview.route.slug.unwrap(), content="intro")
  inspect(bundle.publish.ready, content="true")
  inspect(bundle.exported_at, content="2026-05-10T00:04:00Z")
}

///|
test "app server exports publication payload bundle envelope" {
  let exported = app_server_export_publication_payload(
    app_server_publishable_snapshot(),
    "pub-intro",
    at="2026-05-10T00:05:00Z",
  )
  let bundle = exported.bundle.unwrap()
  inspect(exported.ok, content="true")
  inspect(exported.tool, content="export_publication_payload")
  inspect(exported.schema_version, content="papyr.app-server-artifact.v0")
  inspect(exported.artifact_kind, content="publication_payload")
  inspect(exported.publication_id, content="pub-intro")
  inspect(bundle.workspace_id, content="visitor-docs-site")
  inspect(bundle.publication.href, content="/docs/intro")
  inspect(bundle.document.unwrap().source, content="# Intro")
  inspect(
    bundle.target.unwrap().endpoint,
    content="https://example.invalid/publish",
  )
  inspect(bundle.generated_at, content="2026-05-10T00:05:00Z")
}

///|
test "app server exports preview artifact bundle envelope" {
  let exported = app_server_export_preview_artifact(
    app_server_publishable_snapshot(),
    at="2026-05-10T00:06:00Z",
  )
  let bundle = exported.bundle.unwrap()
  inspect(exported.ok, content="true")
  inspect(exported.tool, content="export_preview_artifact")
  inspect(exported.schema_version, content="papyr.app-server-artifact.v0")
  inspect(exported.artifact_kind, content="preview_artifact")
  inspect(bundle.preview.route.slug.unwrap(), content="intro")
  inspect(bundle.preview.mode, content="published")
  inspect(bundle.document.unwrap().id, content="intro")
  inspect(bundle.publication.unwrap().id, content="pub-intro")
  inspect(bundle.generated_at, content="2026-05-10T00:06:00Z")
}

///|
test "app server exports diagnostic report bundle envelope" {
  let failed = app_server_update_document(
    app_server_sample_snapshot(),
    "missing",
    source=Some("# Missing"),
    at="2026-05-10T00:02:00Z",
  )
  let exported = app_server_export_diagnostic_report(
    failed.snapshot.unwrap(),
    at="2026-05-10T00:07:00Z",
  )
  let bundle = exported.bundle.unwrap()
  inspect(exported.ok, content="true")
  inspect(exported.tool, content="export_diagnostic_report")
  inspect(exported.schema_version, content="papyr.app-server-artifact.v0")
  inspect(exported.artifact_kind, content="diagnostic_report")
  inspect(bundle.workspace_id, content="visitor-docs-site")
  inspect(bundle.diagnostics[0].code, content="document_not_found")
  inspect(bundle.generated_at, content="2026-05-10T00:07:00Z")
  inspect(exported.diagnostics.length(), content="0")
}
