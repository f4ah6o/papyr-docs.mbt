import { useEffect, useMemo, useRef, useState } from "react";
import {
  createOpfsWorkspaceStore,
  type WorkspaceStore,
  type WorkspaceSummary,
} from "@f12o/papyr-adapter-opfs";
import { EditorWorkspace } from "@f12o/papyr-editor-ui";
import "@f12o/papyr-editor-ui/styles.css";
import { parseMarkdown, serializeDocument } from "@f12o/papyr-markdown";
import { renderPapyrView } from "@f12o/papyr-preview";
import { createMiniSearchAdapter } from "@f12o/papyr-search";
import {
  buildWorkspaceBookPayload,
  createStarterWorkspace,
  deriveWorkspaceDocumentTitle,
  findWorkspaceChapterBySlugs,
  findWorkspacePublicationBySlug,
  getWorkspacePublicationMeta,
  listWorkspacePublicationSummaries,
  serializeWorkspaceBundle,
  type PublishTargetConfig,
  type WorkspaceExportBundle,
  type WorkspacePublicationKind,
  type WorkspacePublicationMeta,
  type WorkspacePublicationSummary,
  type WorkspaceState,
} from "@f12o/papyr-workspace";
import type { PapyrDocument } from "@f12o/papyr-core";
import {
  registerAdvancedPlaygroundWebMcp,
  type AdvancedPlaygroundWebMcpContext,
} from "./webmcp.js";

type PreviewRoute =
  | { name: "home" }
  | { name: "articles" }
  | { name: "books" }
  | { name: "article"; slug: string }
  | { name: "book"; slug: string }
  | { name: "chapter"; bookSlug: string; chapterSlug: string }
  | { name: "search" };

export function AdvancedPlaygroundApp({
  store: injectedStore,
}: {
  store?: WorkspaceStore;
}) {
  const store = useMemo(
    () => injectedStore ?? createOpfsWorkspaceStore(),
    [injectedStore],
  );
  const [workspaceSummaries, setWorkspaceSummaries] = useState<
    WorkspaceSummary[]
  >([]);
  const [workspace, setWorkspace] = useState<WorkspaceState | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [sourceById, setSourceById] = useState<Record<string, string>>({});
  const [previewRoute, setPreviewRoute] = useState<PreviewRoute>({
    name: "home",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [status, setStatus] = useState("Loading workspace...");
  const [statusTone, setStatusTone] = useState<"idle" | "saved" | "error">(
    "idle",
  );
  const [publishResult, setPublishResult] = useState<{
    siteUrl: string;
    updatedAt: string;
    publishedDocumentCount: number;
  } | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);
  const activeWorkspaceIdRef = useRef("");
  const saveRequestRef = useRef(0);
  const webMcpContextRef = useRef<AdvancedPlaygroundWebMcpContext | null>(null);

  useEffect(() => {
    activeWorkspaceIdRef.current = workspace?.manifest.id ?? "";
  }, [workspace?.manifest.id]);

  useEffect(
    () => registerAdvancedPlaygroundWebMcp(() => webMcpContextRef.current),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      try {
        const summaries = await store.listWorkspaces();
        if (cancelled) return;
        if (summaries.length === 0) {
          const starter = createStarterWorkspace({
            name: "来訪者向け docs site",
          });
          await store.createWorkspace(starter);
          if (cancelled) return;
          setWorkspace(starter);
          setWorkspaceSummaries([
            {
              id: starter.manifest.id,
              name: starter.manifest.name,
              updatedAt: starter.manifest.updatedAt,
            },
          ]);
          setSourceById(toSourceMap(starter.documents));
          setSelectedDocumentId(
            starter.manifest.documentOrder[0] ?? starter.documents[0]?.id ?? "",
          );
          setStatus("Created a starter workspace in OPFS.");
          setStatusTone("saved");
          return;
        }

        setWorkspaceSummaries(summaries);
        const first = await store.loadWorkspace(summaries[0]!.id);
        if (!first || cancelled) return;
        const normalized = normalizeLegacyStarterWorkspace(first);
        if (normalized !== first) {
          await store.saveWorkspace(normalized);
        }
        setWorkspace(normalized);
        setSourceById(toSourceMap(normalized.documents));
        setSelectedDocumentId(
          normalized.manifest.documentOrder[0] ??
            normalized.documents[0]?.id ??
            "",
        );
        setStatus("OPFS から workspace を読み込みました。");
        setStatusTone("saved");
      } catch (error) {
        if (cancelled) return;
        setBootError(asMessage(error));
        setStatus("Workspace の初期化に失敗しました。");
        setStatusTone("error");
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [store]);

  const derived = useMemo(() => {
    if (!workspace)
      return {
        workspace: null as WorkspaceState | null,
        error: null as string | null,
      };
    try {
      const documents = workspace.documents.map((document) => {
        const source = sourceById[document.id] ?? serializeDocument(document);
        const parsed = parseMarkdown(source, { documentId: document.id });
        return {
          ...parsed,
          ...(document.title?.trim() ? { title: document.title } : {}),
          meta: {
            ...document.meta,
          },
        };
      });
      return {
        workspace: {
          ...workspace,
          documents,
        },
        error: null,
      };
    } catch (error) {
      return {
        workspace: null,
        error: asMessage(error),
      };
    }
  }, [sourceById, workspace]);

  const publicationSummaries = useMemo(
    () =>
      derived.workspace
        ? listWorkspacePublicationSummaries(derived.workspace.documents)
        : [],
    [derived.workspace],
  );
  const publicationCounts = useMemo(
    () =>
      publicationSummaries.reduce(
        (counts, summary) => {
          counts[summary.kind] += 1;
          return counts;
        },
        {
          article: 0,
          book: 0,
          chapter: 0,
        } satisfies Record<WorkspacePublicationKind, number>,
      ),
    [publicationSummaries],
  );
  const selectedDocument = useMemo(() => {
    if (!workspace) return null;
    return (
      workspace.documents.find(
        (document) => document.id === selectedDocumentId,
      ) ?? null
    );
  }, [selectedDocumentId, workspace]);
  const selectedPublication = selectedDocument
    ? getWorkspacePublicationMeta(selectedDocument)
    : null;
  const selectedSource = selectedDocument
    ? (sourceById[selectedDocument.id] ?? serializeDocument(selectedDocument))
    : "";
  const hasBooks =
    workspace?.documents.some(
      (document) => getWorkspacePublicationMeta(document)?.kind === "book",
    ) ?? false;
  const publishReady = Boolean(
    workspace?.publishTarget?.endpoint && workspace.publishTarget.workspaceId,
  );
  const searchAdapter = useMemo(() => {
    if (!derived.workspace) return null;
    const adapter = createMiniSearchAdapter();
    for (const document of derived.workspace.documents) adapter.add(document);
    return adapter;
  }, [derived.workspace]);
  const searchResults = useMemo(() => {
    if (!searchAdapter || !searchQuery.trim()) return [];
    return searchAdapter.search(searchQuery.trim());
  }, [searchAdapter, searchQuery]);
  const currentRouteLabel = describePreviewRoute(previewRoute);

  useEffect(() => {
    if (derived.error) {
      setStatus(derived.error);
      setStatusTone("error");
      return;
    }
    if (!derived.workspace) return;

    const nextWorkspace = derived.workspace;
    const requestId = ++saveRequestRef.current;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void store
        .saveWorkspace(nextWorkspace)
        .then(async () => {
          const summaries = await store.listWorkspaces();
          if (
            cancelled ||
            saveRequestRef.current !== requestId ||
            activeWorkspaceIdRef.current !== nextWorkspace.manifest.id
          ) {
            return;
          }
          setWorkspaceSummaries(summaries);
          setStatus("OPFS に保存しました。");
          setStatusTone("saved");
        })
        .catch((error) => {
          if (
            cancelled ||
            saveRequestRef.current !== requestId ||
            activeWorkspaceIdRef.current !== nextWorkspace.manifest.id
          ) {
            return;
          }
          setStatus(asMessage(error));
          setStatusTone("error");
        });
    }, 500);

    setStatus("保存中...");
    setStatusTone("idle");
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [derived.error, derived.workspace, store]);

  webMcpContextRef.current = null;

  if (bootError) {
    return (
      <section className="advanced-playground">
        <div className="panel advanced-playground__empty">
          <p className="eyebrow">advanced playground</p>
          <h1>Workspace を開けませんでした</h1>
          <p>{bootError}</p>
        </div>
      </section>
    );
  }

  if (!workspace || !selectedDocument || !selectedPublication) {
    return (
      <section className="advanced-playground">
        <div className="panel advanced-playground__empty">
          <p className="eyebrow">advanced playground</p>
          <h1>Workspace を準備中です</h1>
          <p>OPFS 上の workspace を読み込んでいます。</p>
        </div>
      </section>
    );
  }

  const activePreviewWorkspace = derived.workspace ?? workspace;
  const previewWorkspace =
    activePreviewWorkspace.documents.length > 0
      ? activePreviewWorkspace
      : workspace;

  const updateWorkspace = (
    recipe: (current: WorkspaceState) => WorkspaceState,
  ) => {
    setWorkspace((current) => (current ? recipe(current) : current));
  };

  const updateDocument = (
    documentId: string,
    recipe: (document: PapyrDocument) => PapyrDocument,
  ) => {
    updateWorkspace((current) => ({
      ...current,
      manifest: touchManifest(current.manifest),
      documents: current.documents.map((document) =>
        document.id === documentId ? recipe(document) : document,
      ),
    }));
  };

  const activateWorkspace = async (
    nextWorkspace: WorkspaceState,
  ): Promise<{
    id: string;
    name: string;
  }> => {
    const normalized = normalizeLegacyStarterWorkspace(nextWorkspace);
    if (normalized !== nextWorkspace) {
      await store.saveWorkspace(normalized);
    }
    setWorkspace(normalized);
    setWorkspaceSummaries(await store.listWorkspaces());
    setSourceById(toSourceMap(normalized.documents));
    setSelectedDocumentId(
      normalized.manifest.documentOrder[0] ?? normalized.documents[0]?.id ?? "",
    );
    setPreviewRoute({ name: "home" });
    setPublishResult(null);
    return {
      id: normalized.manifest.id,
      name: normalized.manifest.name,
    };
  };

  const handleCreateWorkspace = async (name?: string) => {
    const created = createStarterWorkspace({
      name:
        name?.trim() || `来訪者向け docs site ${workspaceSummaries.length + 1}`,
    });
    await store.createWorkspace(created);
    return activateWorkspace(created);
  };

  const handleOpenWorkspace = async (workspaceId: string) => {
    const loaded = await store.loadWorkspace(workspaceId);
    if (!loaded) throw new Error(`Workspace not found: ${workspaceId}`);
    return activateWorkspace(loaded);
  };

  const handleAddDocument = (kind: WorkspacePublicationKind) => {
    if (!workspace) throw new Error("Workspace is not ready.");
    if (kind === "chapter" && !hasBooks) {
      setStatus("chapter を追加する前に book を作ります。");
      setStatusTone("error");
      throw new Error("chapter を追加する前に book を作ります。");
    }

    const next = createWorkspaceDocument(kind, workspace.documents);
    setWorkspace({
      ...workspace,
      manifest: {
        ...touchManifest(workspace.manifest),
        documentOrder: [...workspace.manifest.documentOrder, next.id],
      },
      documents: [...workspace.documents, next],
    });
    setSourceById((existing) => ({
      ...existing,
      [next.id]: serializeDocument(next),
    }));
    setSelectedDocumentId(next.id);
    return {
      id: next.id,
      title: deriveWorkspaceDocumentTitle(next),
      kind,
    };
  };

  const handleDeleteDocument = (documentId: string) => {
    if (!workspace) return;
    const target = workspace.documents.find(
      (document) => document.id === documentId,
    );
    const publication = target ? getWorkspacePublicationMeta(target) : null;
    if (publication?.kind === "book") {
      const hasLinkedChapters = workspace.documents.some((document) => {
        const meta = getWorkspacePublicationMeta(document);
        return meta?.kind === "chapter" && meta.bookId === documentId;
      });
      if (hasLinkedChapters) {
        setStatus("Delete chapters before deleting the book.");
        setStatusTone("error");
        return;
      }
    }

    const remaining = workspace.documents.filter(
      (document) => document.id !== documentId,
    );
    setWorkspace({
      ...workspace,
      manifest: {
        ...touchManifest(workspace.manifest),
        documentOrder: workspace.manifest.documentOrder.filter(
          (id) => id !== documentId,
        ),
      },
      documents: remaining,
    });
    setSourceById((existing) => {
      const next = { ...existing };
      delete next[documentId];
      return next;
    });
    setSelectedDocumentId(remaining[0]?.id ?? "");
  };

  const handleExport = () => {
    if (!derived.workspace) {
      setStatus("export の前に markdown error を直してください。");
      setStatusTone("error");
      return;
    }
    const bundle = serializeWorkspaceBundle(derived.workspace);
    downloadJson(
      `${derived.workspace.manifest.id}.papyr-workspace.json`,
      bundle,
    );
    setStatus("Workspace bundle をダウンロードしました。");
    setStatusTone("saved");
  };

  const handleImportClick = () => {
    importRef.current?.click();
  };

  const handleImportFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text()) as WorkspaceExportBundle;
      const imported = await store.importWorkspace(raw);
      setWorkspace(imported);
      setWorkspaceSummaries(await store.listWorkspaces());
      setSourceById(toSourceMap(imported.documents));
      setSelectedDocumentId(
        imported.manifest.documentOrder[0] ?? imported.documents[0]?.id ?? "",
      );
      setPreviewRoute({ name: "home" });
      setStatus(
        `Workspace を ${imported.manifest.id} として OPFS に import しました。`,
      );
      setStatusTone("saved");
    } catch (error) {
      setStatus(asMessage(error));
      setStatusTone("error");
    } finally {
      event.target.value = "";
    }
  };

  const handlePublish = async () => {
    if (!derived.workspace) {
      setStatus("publish の前に markdown error を直してください。");
      setStatusTone("error");
      throw new Error("publish の前に markdown error を直してください。");
    }
    const target = derived.workspace.publishTarget;
    if (!target?.endpoint || !target.workspaceId) {
      setStatus("publish には endpoint と workspace id が必要です。");
      setStatusTone("error");
      throw new Error("publish には endpoint と workspace id が必要です。");
    }

    try {
      const response = await fetch(resolvePublishUrl(target), {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          ...(target.token ? { authorization: `Bearer ${target.token}` } : {}),
        },
        body: JSON.stringify(serializeWorkspaceBundle(derived.workspace)),
      });
      if (!response.ok) {
        throw new Error(
          `publish failed: ${response.status} ${await response.text()}`,
        );
      }
      const payload = (await response.json()) as {
        siteUrl: string;
        updatedAt: string;
        publishedDocumentCount: number;
      };
      setPublishResult(payload);
      setStatus("Workspace を publish しました。");
      setStatusTone("saved");
      return payload;
    } catch (error) {
      setStatus(asMessage(error));
      setStatusTone("error");
      throw error;
    }
  };

  const navigatePreview = (
    route: PreviewRoute,
    options: { query?: string } = {},
  ) => {
    if (typeof options.query === "string") {
      setSearchQuery(options.query);
    }
    setPreviewRoute(route);
  };

  webMcpContextRef.current = {
    getState: () => ({
      activeWorkspaceId: workspace.manifest.id,
      activeWorkspaceName: workspace.manifest.name,
      previewRoute,
      searchQuery,
      documentCount: workspace.documents.length,
      publicationCount: publicationSummaries.length,
      publishConfigured: Boolean(
        workspace.publishTarget?.endpoint &&
        workspace.publishTarget.workspaceId,
      ),
      ...(publishResult?.siteUrl
        ? { lastPublishedSiteUrl: publishResult.siteUrl }
        : {}),
    }),
    listWorkspaces: () =>
      workspaceSummaries.map((summary) => ({
        id: summary.id,
        name: summary.name,
        updatedAt: summary.updatedAt,
      })),
    listPublications: () =>
      publicationSummaries.map((summary) => ({
        id: summary.id,
        title: summary.title,
        kind: summary.kind,
        slug: summary.slug,
        published: summary.published,
        summary: summary.summary,
      })),
    searchWorkspace: (query, limit) => {
      if (!derived.workspace || !query.trim()) return [];
      const adapter = createMiniSearchAdapter();
      for (const document of derived.workspace.documents) adapter.add(document);
      const summariesById = new Map(
        publicationSummaries.map((summary) => [summary.id, summary]),
      );
      return adapter
        .search(query.trim())
        .filter((result) => summariesById.has(result.id))
        .slice(0, limit)
        .map((result) => {
          const summary = summariesById.get(result.id)!;
          return {
            id: summary.id,
            title: summary.title,
            kind: summary.kind,
            slug: summary.slug,
            score: result.score,
          };
        });
    },
    createWorkspace: handleCreateWorkspace,
    openWorkspace: handleOpenWorkspace,
    addDocument: async (kind) => handleAddDocument(kind),
    navigatePreview,
    publishWorkspace: handlePublish,
  };

  return (
    <div className="advanced-playground">
      <section className="hero hero--compact advanced-playground__hero">
        <div className="hero__body">
          <p className="eyebrow">advanced playground</p>
          <h1>browser 上で組み立てる docs site workspace</h1>
          <p className="hero__lead">
            browser の中で複数 document の docs site を組み立て、OPFS に保存し、
            local preview を見ながら bundle の export や外部 Papyr endpoint への
            publish まで進めます。
          </p>
        </div>
        <div className="advanced-playground__hero-actions">
          <button
            type="button"
            className="button"
            onClick={() => void handleCreateWorkspace()}
          >
            新しい workspace
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={handleExport}
          >
            bundle を export
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={handleImportClick}
          >
            bundle を import
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={handleImportFile}
          />
        </div>
      </section>

      <section className="advanced-playground__status">
        <span className={`advanced-playground__status-pill is-${statusTone}`}>
          {status}
        </span>
        {publishResult ? (
          <a
            href={publishResult.siteUrl}
            target="_blank"
            rel="noreferrer"
            className="advanced-playground__publish-link"
          >
            公開した site を開く
          </a>
        ) : null}
      </section>

      <section
        className="advanced-playground__workflow"
        aria-label="Advanced playground workflow"
      >
        <article className="panel advanced-playground__workflow-card">
          <div className="advanced-playground__section-copy">
            <p className="eyebrow">step 1</p>
            <h2>Workspace</h2>
            <p>試行中の workspace を OPFS に保存しながら進めます。</p>
          </div>
          <strong className="advanced-playground__workflow-value">
            {workspaceSummaries.length} 件
          </strong>
          <div className="advanced-playground__workflow-meta">
            <span>現在: {workspace.manifest.name}</span>
            <span>更新日: {workspace.manifest.updatedAt.slice(0, 10)}</span>
          </div>
        </article>
        <article className="panel advanced-playground__workflow-card">
          <div className="advanced-playground__section-copy">
            <p className="eyebrow">step 2</p>
            <h2>Content</h2>
            <p>
              article、book、chapter を追加して、editor で metadata を詰めます。
            </p>
          </div>
          <strong className="advanced-playground__workflow-value">
            {publicationSummaries.length} 件
          </strong>
          <div className="advanced-playground__workflow-meta">
            <span>article {publicationCounts.article} 件</span>
            <span>book {publicationCounts.book} 件</span>
            <span>chapter {publicationCounts.chapter} 件</span>
          </div>
        </article>
        <article className="panel advanced-playground__workflow-card">
          <div className="advanced-playground__section-copy">
            <p className="eyebrow">step 3</p>
            <h2>Preview</h2>
            <p>editor の横で来訪者向け route を確認しながら調整します。</p>
          </div>
          <strong className="advanced-playground__workflow-value">
            {describePreviewRoute(previewRoute)}
          </strong>
          <div className="advanced-playground__workflow-actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => navigatePreview({ name: "home" })}
            >
              home preview
            </button>
            <button
              type="button"
              className="button button--secondary"
              onClick={() =>
                navigatePreview({ name: "search" }, { query: searchQuery })
              }
            >
              search preview
            </button>
          </div>
        </article>
        <article className="panel advanced-playground__workflow-card">
          <div className="advanced-playground__section-copy">
            <p className="eyebrow">step 4</p>
            <h2>Publish</h2>
            <p>local preview が固まってから endpoint を設定します。</p>
          </div>
          <strong className="advanced-playground__workflow-value">
            {publishReady ? "設定済み" : "endpoint 未設定"}
          </strong>
          <div className="advanced-playground__workflow-meta">
            <span>
              {publishReady
                ? "publish できます"
                : "endpoint と workspace id を入れます"}
            </span>
            {publishResult ? (
              <span>最終 publish: {publishResult.updatedAt.slice(0, 10)}</span>
            ) : null}
          </div>
        </article>
      </section>

      <div className="advanced-playground__layout">
        <aside className="advanced-playground__sidebar">
          <section className="panel">
            <div className="advanced-playground__section-header">
              <div className="advanced-playground__section-copy">
                <p className="eyebrow">workspaces</p>
                <h2>OPFS</h2>
                <p>
                  {workspaceSummaries.length} 件の browser-local workspace
                  snapshot です。
                </p>
              </div>
            </div>
            <div className="advanced-playground__workspace-list">
              {workspaceSummaries.map((summary) => (
                <button
                  key={summary.id}
                  type="button"
                  className={`advanced-playground__workspace-item${
                    workspace.manifest.id === summary.id ? " is-active" : ""
                  }`}
                  onClick={() => void handleOpenWorkspace(summary.id)}
                >
                  <strong>{summary.name}</strong>
                  <small>{summary.updatedAt.slice(0, 10)}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="advanced-playground__section-header">
              <div className="advanced-playground__section-copy">
                <p className="eyebrow">documents</p>
                <h2>{workspace.manifest.name}</h2>
                <p>
                  document を選び、metadata を直し、preview を見ながら source
                  を編集します。
                </p>
              </div>
            </div>
            <label className="advanced-playground__field">
              <span>workspace 名</span>
              <input
                type="text"
                value={workspace.manifest.name}
                onChange={(event) =>
                  updateWorkspace((current) => ({
                    ...current,
                    manifest: {
                      ...touchManifest(current.manifest),
                      name: event.target.value,
                    },
                    site:
                      current.site.title === current.manifest.name
                        ? {
                            ...current.site,
                            title: event.target.value,
                          }
                        : current.site,
                  }))
                }
              />
            </label>
            <div className="advanced-playground__doc-actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => handleAddDocument("article")}
              >
                新しい article
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => handleAddDocument("book")}
              >
                新しい book
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => handleAddDocument("chapter")}
                disabled={!hasBooks}
              >
                新しい chapter
              </button>
            </div>
            {!hasBooks ? <p>chapter を追加する前に book を作ります。</p> : null}
            <div className="advanced-playground__document-list">
              {publicationSummaries.map((summary) => (
                <button
                  key={summary.id}
                  type="button"
                  className={`advanced-playground__document-item${
                    selectedDocumentId === summary.id ? " is-active" : ""
                  }`}
                  onClick={() => setSelectedDocumentId(summary.id)}
                >
                  <strong>{summary.title}</strong>
                  <small>
                    {summary.kind} / {summary.slug}
                  </small>
                </button>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="advanced-playground__section-header">
              <div className="advanced-playground__section-copy">
                <p className="eyebrow">site settings</p>
                <h2>共通 docs chrome</h2>
                <p>
                  local preview で共通に使う title、tagline、landing copy
                  を整えます。
                </p>
              </div>
            </div>
            <SiteSettingsForm workspace={workspace} onChange={setWorkspace} />
          </section>

          <section className="panel">
            <div className="advanced-playground__section-header">
              <div className="advanced-playground__section-copy">
                <p className="eyebrow">publish target</p>
                <h2>外部 API</h2>
                <p>
                  local bundle の形が固まってから remote endpoint をつなぎます。
                </p>
              </div>
            </div>
            <PublishTargetForm
              workspace={workspace}
              onChange={setWorkspace}
              onPublish={handlePublish}
            />
          </section>
        </aside>

        <main className="advanced-playground__main">
          <WorkspacePreview
            workspace={previewWorkspace}
            route={previewRoute}
            onNavigate={navigatePreview}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            searchResults={searchResults}
          />

          <section className="panel advanced-playground__editor-panel">
            <div className="advanced-playground__section-header">
              <div className="advanced-playground__section-copy">
                <p className="eyebrow">editor</p>
                <h2>
                  {selectedDocument.title ??
                    deriveWorkspaceDocumentTitle(selectedDocument)}
                </h2>
                <p>
                  {selectedPublication.kind} / {selectedPublication.slug} /
                  preview: {currentRouteLabel}
                </p>
              </div>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => handleDeleteDocument(selectedDocument.id)}
              >
                Delete
              </button>
            </div>

            <DocumentMetaForm
              documents={workspace.documents}
              document={selectedDocument}
              publication={selectedPublication}
              onChange={(nextDocument) => {
                updateDocument(selectedDocument.id, () => nextDocument);
              }}
            />

            <div className="advanced-playground__editor-shell">
              <EditorWorkspace
                source={selectedSource}
                onSourceChange={(source) =>
                  setSourceById((existing) => ({
                    ...existing,
                    [selectedDocument.id]: source,
                  }))
                }
                documentId={selectedDocument.id}
                eyebrow="papyr workspace"
                title={
                  selectedDocument.title ??
                  deriveWorkspaceDocumentTitle(selectedDocument)
                }
                subtitle={workspace.manifest.name}
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function SiteSettingsForm({
  workspace,
  onChange,
}: {
  workspace: WorkspaceState;
  onChange: React.Dispatch<React.SetStateAction<WorkspaceState | null>>;
}) {
  return (
    <div className="advanced-playground__form-grid">
      <label className="advanced-playground__field">
        <span>Title</span>
        <input
          type="text"
          value={workspace.site.title}
          onChange={(event) =>
            onChange((current) =>
              current
                ? {
                    ...current,
                    manifest: touchManifest(current.manifest),
                    site: {
                      ...current.site,
                      title: event.target.value,
                    },
                  }
                : current,
            )
          }
        />
      </label>
      <label className="advanced-playground__field">
        <span>Tagline</span>
        <input
          type="text"
          value={workspace.site.tagline}
          onChange={(event) =>
            onChange((current) =>
              current
                ? {
                    ...current,
                    manifest: touchManifest(current.manifest),
                    site: {
                      ...current.site,
                      tagline: event.target.value,
                    },
                  }
                : current,
            )
          }
        />
      </label>
      <label className="advanced-playground__field">
        <span>Logo emoji</span>
        <input
          type="text"
          value={workspace.site.logoEmoji ?? ""}
          onChange={(event) =>
            onChange((current) =>
              current
                ? {
                    ...current,
                    manifest: touchManifest(current.manifest),
                    site: {
                      ...current.site,
                      logoEmoji: event.target.value || undefined,
                    },
                  }
                : current,
            )
          }
        />
      </label>
      <label className="advanced-playground__field">
        <span>Home intro</span>
        <textarea
          rows={4}
          value={workspace.site.homeIntro}
          onChange={(event) =>
            onChange((current) =>
              current
                ? {
                    ...current,
                    manifest: touchManifest(current.manifest),
                    site: {
                      ...current.site,
                      homeIntro: event.target.value,
                    },
                  }
                : current,
            )
          }
        />
      </label>
    </div>
  );
}

function PublishTargetForm({
  workspace,
  onChange,
  onPublish,
}: {
  workspace: WorkspaceState;
  onChange: React.Dispatch<React.SetStateAction<WorkspaceState | null>>;
  onPublish: () => void;
}) {
  const target = workspace.publishTarget ?? {
    endpoint: "",
    workspaceId: workspace.manifest.id,
    token: "",
  };

  const updateTarget = (patch: Partial<PublishTargetConfig>) => {
    onChange((current) =>
      current
        ? {
            ...current,
            manifest: touchManifest(current.manifest),
            publishTarget: {
              ...(current.publishTarget ?? {
                endpoint: "",
                workspaceId: current.manifest.id,
                token: "",
              }),
              ...patch,
            },
          }
        : current,
    );
  };

  return (
    <div className="advanced-playground__form-grid">
      <label className="advanced-playground__field">
        <span>Endpoint</span>
        <input
          type="text"
          placeholder="https://host/api/workspaces/:workspaceId/publish"
          value={target.endpoint}
          onChange={(event) => updateTarget({ endpoint: event.target.value })}
        />
      </label>
      <label className="advanced-playground__field">
        <span>Workspace id</span>
        <input
          type="text"
          value={target.workspaceId}
          onChange={(event) =>
            updateTarget({ workspaceId: event.target.value })
          }
        />
      </label>
      <label className="advanced-playground__field">
        <span>Bearer token</span>
        <input
          type="password"
          value={target.token ?? ""}
          onChange={(event) =>
            updateTarget({ token: event.target.value || undefined })
          }
        />
      </label>
      <p>
        Bearer token is stored locally in OPFS as plain text for this browser
        profile.
      </p>
      <button type="button" className="button" onClick={onPublish}>
        Publish workspace
      </button>
    </div>
  );
}

function DocumentMetaForm({
  documents,
  document,
  publication,
  onChange,
}: {
  documents: PapyrDocument[];
  document: PapyrDocument;
  publication: WorkspacePublicationMeta;
  onChange: (nextDocument: PapyrDocument) => void;
}) {
  const books = documents.filter(
    (item) => getWorkspacePublicationMeta(item)?.kind === "book",
  );
  const updateMeta = (patch: Partial<WorkspacePublicationMeta>) => {
    const nextPublication = {
      ...publication,
      ...patch,
    } as WorkspacePublicationMeta;
    onChange({
      ...document,
      meta: {
        ...document.meta,
        publication: nextPublication,
      },
    });
  };

  return (
    <div className="advanced-playground__meta-grid">
      <label className="advanced-playground__field">
        <span>Title</span>
        <input
          type="text"
          value={document.title ?? ""}
          onChange={(event) =>
            onChange({
              ...document,
              title: event.target.value,
            })
          }
        />
      </label>
      <label className="advanced-playground__field">
        <span>Slug</span>
        <input
          type="text"
          value={publication.slug}
          onChange={(event) =>
            updateMeta({ slug: slugify(event.target.value) })
          }
        />
      </label>
      <label className="advanced-playground__field">
        <span>Emoji</span>
        <input
          type="text"
          value={publication.emoji ?? ""}
          onChange={(event) =>
            updateMeta({ emoji: event.target.value || undefined })
          }
        />
      </label>
      <label className="advanced-playground__field">
        <span>Topics</span>
        <input
          type="text"
          value={publication.topics.join(", ")}
          onChange={(event) =>
            updateMeta({ topics: splitTopics(event.target.value) })
          }
        />
      </label>
      <label className="advanced-playground__field">
        <span>Published</span>
        <input
          type="checkbox"
          checked={publication.published}
          onChange={(event) => updateMeta({ published: event.target.checked })}
        />
      </label>
      <label className="advanced-playground__field">
        <span>Summary</span>
        <textarea
          rows={3}
          value={publication.summary}
          onChange={(event) => updateMeta({ summary: event.target.value })}
        />
      </label>
      {publication.kind === "chapter" ? (
        <>
          <label className="advanced-playground__field">
            <span>Book</span>
            <select
              value={publication.bookId}
              onChange={(event) =>
                updateMeta({
                  bookId: event.target.value,
                } as Partial<WorkspacePublicationMeta>)
              }
            >
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title ?? deriveWorkspaceDocumentTitle(book)}
                </option>
              ))}
            </select>
          </label>
          <label className="advanced-playground__field">
            <span>Chapter order</span>
            <input
              type="number"
              min={1}
              step={1}
              value={publication.chapterOrder}
              onChange={(event) =>
                updateMeta({
                  chapterOrder: Math.max(
                    1,
                    Number.parseInt(event.target.value, 10) || 1,
                  ),
                } as Partial<WorkspacePublicationMeta>)
              }
            />
          </label>
        </>
      ) : null}
    </div>
  );
}

function WorkspacePreview({
  workspace,
  route,
  onNavigate,
  searchQuery,
  onSearchQueryChange,
  searchResults,
}: {
  workspace: WorkspaceState;
  route: PreviewRoute;
  onNavigate: (route: PreviewRoute) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  searchResults: Array<{ id: string; score: number }>;
}) {
  const publications = listWorkspacePublicationSummaries(workspace.documents);
  const articles = publications.filter(
    (publication) => publication.kind === "article" && publication.published,
  );
  const books = publications.filter(
    (publication) => publication.kind === "book" && publication.published,
  );

  let content: JSX.Element;
  switch (route.name) {
    case "home":
      content = (
        <section className="advanced-playground__preview-stack">
          <header className="advanced-playground__preview-hero">
            <p className="eyebrow">home</p>
            <h2>
              {workspace.site.logoEmoji ? `${workspace.site.logoEmoji} ` : ""}
              {workspace.site.title}
            </h2>
            <p>{workspace.site.tagline}</p>
            <p>{workspace.site.homeIntro}</p>
          </header>
          <section className="advanced-playground__preview-grid">
            <article className="panel">
              <p className="eyebrow">articles</p>
              <h3>最新の更新</h3>
              {articles.slice(0, 3).map((article) => (
                <button
                  key={article.id}
                  type="button"
                  className="advanced-playground__preview-link"
                  onClick={() =>
                    onNavigate({ name: "article", slug: article.slug })
                  }
                >
                  {article.title}
                </button>
              ))}
            </article>
            <article className="panel">
              <p className="eyebrow">books</p>
              <h3>guide と handbook</h3>
              {books.slice(0, 3).map((book) => (
                <button
                  key={book.id}
                  type="button"
                  className="advanced-playground__preview-link"
                  onClick={() => onNavigate({ name: "book", slug: book.slug })}
                >
                  {book.title}
                </button>
              ))}
            </article>
          </section>
        </section>
      );
      break;
    case "articles":
      content = (
        <section className="advanced-playground__preview-stack">
          <h2>articles</h2>
          {articles.map((article) => (
            <article key={article.id} className="panel">
              <button
                type="button"
                className="advanced-playground__preview-link"
                onClick={() =>
                  onNavigate({ name: "article", slug: article.slug })
                }
              >
                {article.title}
              </button>
              <p>{article.summary}</p>
            </article>
          ))}
        </section>
      );
      break;
    case "books":
      content = (
        <section className="advanced-playground__preview-stack">
          <h2>books</h2>
          {books.map((book) => {
            const payload = buildWorkspaceBookPayload(
              book.id,
              workspace.documents,
            );
            return (
              <article key={book.id} className="panel">
                <button
                  type="button"
                  className="advanced-playground__preview-link"
                  onClick={() => onNavigate({ name: "book", slug: book.slug })}
                >
                  {book.title}
                </button>
                <p>{book.summary}</p>
                <small>chapter {payload?.chapters.length ?? 0} 件</small>
              </article>
            );
          })}
        </section>
      );
      break;
    case "article": {
      const article = findWorkspacePublicationBySlug(
        publications,
        "article",
        route.slug,
      );
      const document = article
        ? (workspace.documents.find((item) => item.id === article.id) ?? null)
        : null;
      content =
        article && document ? (
          <PreviewDocumentPage
            label="article"
            title={article.title}
            summary={article.summary}
            document={document}
          />
        ) : (
          <p>article が見つかりません。</p>
        );
      break;
    }
    case "book": {
      const book = findWorkspacePublicationBySlug(
        publications,
        "book",
        route.slug,
      );
      const payload = book
        ? buildWorkspaceBookPayload(book.id, workspace.documents)
        : null;
      content =
        book && payload ? (
          <section className="advanced-playground__preview-stack">
            <PreviewDocumentPage
              label="book"
              title={book.title}
              summary={book.summary}
              document={payload.book}
            />
            <section className="panel">
              <p className="eyebrow">chapters</p>
              <div className="advanced-playground__preview-stack">
                {payload.chapters.map((chapter) => {
                  const summary = publications.find(
                    (item) => item.id === chapter.id,
                  );
                  if (!summary || summary.kind !== "chapter") return null;
                  return (
                    <button
                      key={chapter.id}
                      type="button"
                      className="advanced-playground__preview-link"
                      onClick={() =>
                        onNavigate({
                          name: "chapter",
                          bookSlug: book.slug,
                          chapterSlug: summary.slug,
                        })
                      }
                    >
                      {summary.title}
                    </button>
                  );
                })}
              </div>
            </section>
          </section>
        ) : (
          <p>book が見つかりません。</p>
        );
      break;
    }
    case "chapter": {
      const match = findWorkspaceChapterBySlugs(
        publications,
        route.bookSlug,
        route.chapterSlug,
      );
      const document = match
        ? (workspace.documents.find((item) => item.id === match.chapter.id) ??
          null)
        : null;
      content =
        match && document ? (
          <PreviewDocumentPage
            label={`chapter / ${match.book.title}`}
            title={match.chapter.title}
            summary={match.chapter.summary}
            document={document}
          />
        ) : (
          <p>chapter が見つかりません。</p>
        );
      break;
    }
    case "search":
      content = (
        <section className="advanced-playground__preview-stack">
          <h2>search</h2>
          {searchResults.length === 0 ? (
            <p>一致する document はまだありません。</p>
          ) : (
            searchResults.map((result) => {
              const summary = publications.find(
                (item) => item.id === result.id,
              );
              if (!summary) return null;
              return (
                <article key={result.id} className="panel">
                  <button
                    type="button"
                    className="advanced-playground__preview-link"
                    onClick={() => {
                      if (summary.kind === "article") {
                        onNavigate({ name: "article", slug: summary.slug });
                      } else if (summary.kind === "book") {
                        onNavigate({ name: "book", slug: summary.slug });
                      } else {
                        const book = publications.find(
                          (item) => item.id === summary.bookId,
                        );
                        if (book?.kind === "book") {
                          onNavigate({
                            name: "chapter",
                            bookSlug: book.slug,
                            chapterSlug: summary.slug,
                          });
                        }
                      }
                    }}
                  >
                    {summary.title}
                  </button>
                  <small>score {result.score.toFixed(2)}</small>
                </article>
              );
            })
          )}
        </section>
      );
      break;
  }

  return (
    <section
      className="panel advanced-playground__preview"
      aria-label="Advanced playground local preview"
    >
      <div className="advanced-playground__section-header">
        <div>
          <p className="eyebrow">local preview</p>
          <h2 data-testid="advanced-playground-preview-site-title">
            {workspace.site.title}
          </h2>
        </div>
        <div className="advanced-playground__preview-summary">
          <span>article {articles.length} 件</span>
          <span>book {books.length} 件</span>
          <span>{describePreviewRoute(route)}</span>
        </div>
      </div>
      <div className="advanced-playground__preview-nav">
        <button
          type="button"
          className="button button--secondary"
          onClick={() => onNavigate({ name: "home" })}
        >
          Home
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => onNavigate({ name: "articles" })}
        >
          Articles
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => onNavigate({ name: "books" })}
        >
          Books
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => onNavigate({ name: "search" })}
        >
          Search
        </button>
        <input
          type="search"
          placeholder="docs を検索"
          value={searchQuery}
          onChange={(event) => {
            onSearchQueryChange(event.target.value);
            onNavigate({ name: "search" });
          }}
        />
      </div>
      <div className="advanced-playground__preview-frame">{content}</div>
    </section>
  );
}

function PreviewDocumentPage({
  label,
  title,
  summary,
  document,
}: {
  label: string;
  title: string;
  summary: string;
  document: PapyrDocument;
}) {
  return (
    <section className="advanced-playground__preview-stack">
      <header className="panel">
        <p className="eyebrow">{label}</p>
        <h2>{title}</h2>
        <p>{summary}</p>
      </header>
      <article className="panel">
        <DocumentPreviewSurface document={document} />
      </article>
    </section>
  );
}

function DocumentPreviewSurface({ document }: { document: PapyrDocument }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    void renderPapyrView(ref.current, {
      document,
      mode: "document",
    });
  }, [document]);

  return <div ref={ref} className="preview-surface" />;
}

function describePreviewRoute(route: PreviewRoute): string {
  switch (route.name) {
    case "home":
      return "home";
    case "articles":
      return "articles";
    case "books":
      return "books";
    case "article":
      return `article: ${route.slug}`;
    case "book":
      return `book: ${route.slug}`;
    case "chapter":
      return `chapter: ${route.chapterSlug}`;
    case "search":
      return "search";
  }
}

function touchManifest(
  manifest: WorkspaceState["manifest"],
): WorkspaceState["manifest"] {
  return {
    ...manifest,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeLegacyStarterWorkspace(
  workspace: WorkspaceState,
): WorkspaceState {
  let changed = false;
  let next = workspace;

  if (next.manifest.name === "Visitor docs site") {
    next = {
      ...next,
      manifest: {
        ...next.manifest,
        name: "来訪者向け docs site",
      },
    };
    changed = true;
  }

  if (next.site.title === "Visitor docs site") {
    next = {
      ...next,
      site: {
        ...next.site,
        title: "来訪者向け docs site",
      },
    };
    changed = true;
  }

  if (next.site.tagline === "Built locally in the browser with Papyr") {
    next = {
      ...next,
      site: {
        ...next.site,
        tagline: "Papyr を使って browser の中だけで組み立てます",
      },
    };
    changed = true;
  }

  if (
    next.site.homeIntro ===
    "Draft the pages your visitors should see first, then preview and publish the whole site from one workspace."
  ) {
    next = {
      ...next,
      site: {
        ...next.site,
        homeIntro:
          "最初に見せたい page から順に下書きし、そのまま preview と publish まで一つの workspace で進めます。",
      },
    };
    changed = true;
  }

  const normalizedDocuments = next.documents.map((document) =>
    normalizeLegacyStarterDocument(document),
  );
  if (
    normalizedDocuments.some(
      (document, index) => document !== next.documents[index],
    )
  ) {
    next = {
      ...next,
      documents: normalizedDocuments,
    };
    changed = true;
  }

  return changed
    ? { ...next, manifest: touchManifest(next.manifest) }
    : workspace;
}

function normalizeLegacyStarterDocument(
  document: PapyrDocument,
): PapyrDocument {
  const source = serializeDocument(document);
  const articleSource =
    "# What We Ship\n\nUse article pages for updates, changelogs, and short announcements.\n";
  const chapterSource =
    "# Getting Started\n\nUse this chapter to explain the first path a new visitor should follow.\n\n- Share the problem you solve\n- Show the first task\n- Link to deeper references\n";
  const publication = getWorkspacePublicationMeta(document);

  if (
    document.title === "What We Ship" &&
    publication?.kind === "article" &&
    publication.summary === "Recent updates for the site or product." &&
    source === articleSource
  ) {
    const parsed = parseMarkdown(
      "# 今回の更新\n\narticle は更新、変更履歴、短いお知らせを書く場所として使います。\n",
      { documentId: document.id },
    );
    return {
      ...parsed,
      title: "今回の更新",
      meta: {
        ...document.meta,
        publication: {
          ...publication,
          summary: "site や product の最新更新をまとめます。",
        },
      },
    };
  }

  if (
    document.title === "Getting Started" &&
    publication?.kind === "chapter" &&
    publication.summary === "The first chapter for new readers." &&
    source === chapterSource
  ) {
    const parsed = parseMarkdown(
      "# はじめに\n\n最初に読む人向けに、この章で最短の導線を案内します。\n\n- どんな課題を解くのかを書く\n- 最初の作業を一つ見せる\n- 詳しい説明への導線を置く\n",
      { documentId: document.id },
    );
    return {
      ...parsed,
      title: "はじめに",
      meta: {
        ...document.meta,
        publication: {
          ...publication,
          summary: "初めて読む人向けの入口です。",
        },
      },
    };
  }

  if (source.includes('"caption": "New Moonlight diagram"')) {
    const parsed = parseMarkdown(
      source.replace(
        '"caption": "New Moonlight diagram"',
        '"caption": "新しい Moonlight 図"',
      ),
      {
        documentId: document.id,
      },
    );
    return {
      ...parsed,
      ...(document.title?.trim() ? { title: document.title } : {}),
      meta: {
        ...document.meta,
      },
    };
  }

  return document;
}

function createWorkspaceDocument(
  kind: WorkspacePublicationKind,
  documents: PapyrDocument[],
): PapyrDocument {
  const now = new Date().toISOString();
  const chapterBook =
    kind === "chapter"
      ? (documents.find(
          (document) => getWorkspacePublicationMeta(document)?.kind === "book",
        ) ?? null)
      : null;
  if (kind === "chapter" && !chapterBook) {
    throw new Error("book is required before creating a chapter");
  }
  const counter =
    documents.filter(
      (document) => getWorkspacePublicationMeta(document)?.kind === kind,
    ).length + 1;
  const title =
    kind === "article"
      ? `無題の記事 ${counter}`
      : kind === "book"
        ? `無題の book ${counter}`
        : `無題の chapter ${counter}`;
  const slug = slugify(title);
  const id =
    kind === "chapter" ? `${chapterBook!.id}--${slug}` : `${kind}-${slug}`;
  const doc = parseMarkdown(`# ${title}\n\nここから書き始めます。\n`, {
    documentId: id,
  });
  const meta: WorkspacePublicationMeta =
    kind === "chapter"
      ? {
          kind,
          slug,
          summary: "chapter の概要を書きます。",
          published: false,
          topics: [],
          bookId: chapterBook!.id,
          chapterOrder:
            documents.filter((document) => {
              const publication = getWorkspacePublicationMeta(document);
              return (
                publication?.kind === "chapter" &&
                publication.bookId === chapterBook!.id
              );
            }).length + 1,
        }
      : {
          kind,
          slug,
          summary: `${kind} の概要を書きます。`,
          published: false,
          topics: [],
        };
  return {
    ...doc,
    title,
    meta: {
      updatedAt: now,
      publication: meta,
    },
  };
}

function toSourceMap(documents: PapyrDocument[]): Record<string, string> {
  return Object.fromEntries(
    documents.map((document) => [document.id, serializeDocument(document)]),
  );
}

function resolvePublishUrl(target: PublishTargetConfig): string {
  return target.endpoint.includes(":workspaceId")
    ? target.endpoint.replace(
        ":workspaceId",
        encodeURIComponent(target.workspaceId),
      )
    : target.endpoint;
}

function splitTopics(value: string): string[] {
  const seen = new Set<string>();
  return value
    .split(",")
    .map((topic) => topic.trim())
    .filter((topic) => {
      if (!topic || seen.has(topic)) return false;
      seen.add(topic);
      return true;
    });
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function asMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
