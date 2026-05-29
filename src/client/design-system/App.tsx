import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PapyrDocument } from "@f12o/papyr-core";
import {
  EditorWorkspace,
  createSampleDocumentSource,
} from "@f12o/papyr-editor-ui";
import "@f12o/papyr-editor-ui/styles.css";
import { parseMarkdown } from "@f12o/papyr-markdown";
import {
  mountPapyrDocumentViewer,
  mountPapyrSlideViewer,
  type MountedPapyrView,
} from "@f12o/papyr-preview";

const DESIGN_DOCUMENT_ID = "papyr-design-system-sample";

export function DesignSystemApp() {
  const [source, setSource] = useState(() => createSampleDocumentSource());
  const parsed = useMemo(() => parseDesignDocument(source), [source]);

  return (
    <div className="design-system-page">
      <section
        className="design-system-hero"
        aria-labelledby="design-system-title"
      >
        <div className="design-system-hero__topbar" role="presentation">
          <span className="design-system-tag">ds-001</span>
          <span className="design-system-hero__path">
            papyr / docs / design-system
          </span>
          <span className="design-system-hero__spacer" aria-hidden="true" />
          <Status tone="ok" label="operational" />
          <Status tone="info" label="single source" />
        </div>
        <div className="design-system-hero__body">
          <div className="design-system-hero__copy">
            <p className="eyebrow">design system</p>
            <h1 id="design-system-title">Papyr all-in-one authoring surface</h1>
            <p>
              テキスト、Moonlight、viewer、slide viewer を同じ document source
              から確認するための `apps/docs` 向け簡易デザインシステムです。
            </p>
          </div>
          <div
            className="design-system-hero__metrics"
            aria-label="Design system overview"
          >
            <Metric label="surfaces" value="3" trend="stable" />
            <Metric label="patterns" value="3" trend="up" />
            <Metric label="source" value="1" trend="locked" />
          </div>
        </div>
      </section>

      <SectionShell
        id="surface-showcase-title"
        code="S1"
        eyebrow="core surfaces"
        title="Editor / Viewer / Slide viewer"
        summary="1つの Markdown source を編集、閲覧、発表用 slide に投影します。Word と PowerPoint の代替を同じファイルに寄せるための基本面です。"
      >
        {parsed.error ? (
          <div className="banner banner--error">{parsed.error}</div>
        ) : (
          <SurfaceShowcase
            source={source}
            onSourceChange={setSource}
            document={parsed.document}
          />
        )}
      </SectionShell>

      <SectionShell
        id="components-title"
        code="S2"
        eyebrow="components"
        title="Component inventory"
        summary="docs app の既存部品を、操作面に近い密度で並べた最小セットです。"
      >
        <ComponentInventory />
      </SectionShell>

      <SectionShell
        id="patterns-title"
        code="S3"
        eyebrow="patterns"
        title="Useful layouts"
        summary="reference site、API reference、dashboard overview の3パターンを同じ語彙で揃えます。"
      >
        <div className="design-system-pattern-stack">
          <ReferencePattern />
          <ApiReferencePattern />
          <DashboardPattern />
        </div>
      </SectionShell>

      <footer
        className="design-system-statusbar"
        aria-label="design system status"
      >
        <span className="design-system-statusbar__group">
          <Status tone="ok" label="ready" />
          <span>3 surfaces</span>
          <span>3 patterns</span>
          <span>1 source</span>
        </span>
        <span className="design-system-statusbar__group design-system-statusbar__group--end">
          <span className="design-system-kbd">⌘</span>
          <span className="design-system-kbd">K</span>
          <span>jump</span>
        </span>
      </footer>
    </div>
  );
}

function SectionShell({
  id,
  code,
  eyebrow,
  title,
  summary,
  children,
}: {
  id: string;
  code: string;
  eyebrow: string;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <section className="design-system-section" aria-labelledby={id}>
      <div className="design-system-section__header">
        <div className="design-system-section__heading">
          <span className="design-system-tag design-system-tag--accent">
            {code}
          </span>
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 id={id}>{title}</h2>
          </div>
        </div>
        <p>{summary}</p>
      </div>
      <div className="design-system-section__body">{children}</div>
    </section>
  );
}

function SurfaceShowcase({
  source,
  onSourceChange,
  document,
}: {
  source: string;
  onSourceChange: (next: string) => void;
  document: PapyrDocument;
}) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const slideRef = useRef<HTMLDivElement>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [slideError, setSlideError] = useState<string | null>(null);

  useEffect(() => {
    const container = viewerRef.current;
    if (!container) return;
    return mountPreview(
      container,
      () =>
        mountPapyrDocumentViewer(container, {
          document,
          markdownSource: source,
          suppressLeadingTitle: document.title,
        }),
      setViewerError,
    );
  }, [document, source]);

  useEffect(() => {
    const container = slideRef.current;
    if (!container) return;
    return mountPreview(
      container,
      () =>
        mountPapyrSlideViewer(container, {
          document,
          slide: 1,
        }),
      setSlideError,
    );
  }, [document]);

  return (
    <div className="design-system-surfaces">
      <section className="design-system-surface design-system-surface--editor">
        <SurfaceHeader
          eyebrow="editor"
          title="Structured editor"
          tone="ok"
          status="editing"
          slot="01"
        />
        <EditorWorkspace
          source={source}
          onSourceChange={onSourceChange}
          documentId={DESIGN_DOCUMENT_ID}
          eyebrow="single source"
          title="All-in-one document"
          subtitle="text + diagram + slide"
        />
      </section>

      <section className="design-system-surface">
        <SurfaceHeader
          eyebrow="viewer"
          title="Document viewer"
          tone="info"
          status="live"
          slot="02"
        />
        {viewerError ? (
          <div className="banner banner--error">{viewerError}</div>
        ) : (
          <div
            ref={viewerRef}
            className="design-system-preview"
            data-design-system-viewer
          />
        )}
      </section>

      <section className="design-system-surface">
        <SurfaceHeader
          eyebrow="slide viewer"
          title="Presentation mode"
          tone="warn"
          status="standby"
          slot="03"
        />
        {slideError ? (
          <div className="banner banner--error">{slideError}</div>
        ) : (
          <div
            ref={slideRef}
            className="design-system-slide-preview"
            data-design-system-slide-viewer
          />
        )}
      </section>
    </div>
  );
}

function SurfaceHeader({
  eyebrow,
  title,
  tone,
  status,
  slot,
}: {
  eyebrow: string;
  title: string;
  tone: StatusTone;
  status: string;
  slot: string;
}) {
  return (
    <header className="design-system-surface__header">
      <div className="design-system-surface__heading">
        <span className="design-system-slot">{slot}</span>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h3>{title}</h3>
        </div>
      </div>
      <Status tone={tone} label={status} />
    </header>
  );
}

function ComponentInventory() {
  return (
    <div className="design-system-inventory">
      <div className="design-system-kit-card">
        <KitHeader eyebrow="actions" hint="primary / secondary / disabled" />
        <div className="design-system-action-row">
          <button type="button" className="button">
            Publish
          </button>
          <button type="button" className="button button--secondary">
            Preview
          </button>
          <button type="button" disabled>
            Saving
          </button>
        </div>
      </div>
      <div className="design-system-kit-card">
        <KitHeader eyebrow="fields" hint="search" />
        <label className="design-system-field">
          <span>Search scope</span>
          <input type="search" defaultValue="moonlight diagram" />
        </label>
      </div>
      <div className="design-system-kit-card">
        <KitHeader eyebrow="states" hint="chips / banner" />
        <div className="topic-row">
          <span className="topic-chip">draft</span>
          <span className="topic-chip">review</span>
          <span className="topic-chip">slides</span>
        </div>
        <div className="banner">Ready to export</div>
      </div>
      <article className="design-system-kit-card design-system-doc-card">
        <KitHeader eyebrow="document card" hint="summary" />
        <h3>Architecture note</h3>
        <p>
          本文、図、発表用スライドを同じ PapyrDocument
          から生成するサンプルカード。
        </p>
        <div className="meta-row">
          <span>updated today</span>
          <span>6 blocks</span>
        </div>
      </article>
    </div>
  );
}

function KitHeader({ eyebrow, hint }: { eyebrow: string; hint: string }) {
  return (
    <div className="design-system-kit-card__header">
      <p className="eyebrow">{eyebrow}</p>
      <span className="design-system-kit-card__hint">{hint}</span>
    </div>
  );
}

function ReferencePattern() {
  return (
    <article className="design-system-pattern design-system-pattern--reference">
      <header className="design-system-pattern__bar">
        <span className="design-system-tag design-system-tag--accent">P1</span>
        <span className="eyebrow">reference</span>
        <span
          className="design-system-pattern__bar-spacer"
          aria-hidden="true"
        />
        <Status tone="info" label="two-column" />
      </header>
      <div className="design-system-pattern__grid">
        <aside
          className="design-system-pattern__rail"
          aria-label="Reference table of contents"
        >
          <p className="eyebrow">toc</p>
          <a href="#reference-intro">Overview</a>
          <a href="#reference-components">Components</a>
          <a href="#reference-export">Export</a>
        </aside>
        <div className="design-system-pattern__body">
          <nav className="design-system-breadcrumb" aria-label="Breadcrumb">
            <span>Docs</span>
            <span>Design</span>
            <strong>Reference</strong>
          </nav>
          <div className="design-system-pattern__search">
            <input
              type="search"
              aria-label="Search this reference"
              placeholder="Search this reference"
            />
          </div>
          <h3 id="reference-intro">Reference two-column pattern</h3>
          <p>
            目次を左に固定し、本文と検索を右に置く読み物向け layout。長い API
            docs や設計資料でも、現在位置と探索導線を失いにくくします。
          </p>
          <div className="design-system-callout">
            Breadcrumb、TOC、scoped search、本文を1画面に集約。
          </div>
        </div>
      </div>
    </article>
  );
}

function ApiReferencePattern() {
  return (
    <article
      className="design-system-pattern design-system-pattern--api"
      aria-labelledby="api-pattern-title"
    >
      <header className="design-system-pattern__bar">
        <span className="design-system-tag design-system-tag--accent">P2</span>
        <span className="eyebrow">api</span>
        <span
          className="design-system-pattern__bar-spacer"
          aria-hidden="true"
        />
        <Status tone="ok" label="stable" />
      </header>
      <div className="design-system-pattern__grid design-system-pattern__grid--api">
        <div className="design-system-api-list">
          {[
            { name: "EditorWorkspace", kind: "component" },
            { name: "mountPapyrDocumentViewer", kind: "function" },
            { name: "mountPapyrSlideViewer", kind: "function" },
          ].map((item, index) => (
            <button
              key={item.name}
              type="button"
              className={`design-system-api-row${index === 0 ? " is-active" : ""}`}
            >
              <span className="design-system-api-row__kind">{item.kind}</span>
              <span className="design-system-api-row__name">{item.name}</span>
              <small>stable</small>
            </button>
          ))}
        </div>
        <div className="design-system-api-detail">
          <div className="design-system-api-detail__head">
            <h3 id="api-pattern-title">API reference/detail pattern</h3>
            <span className="design-system-tag">v1</span>
          </div>
          <p>
            左で symbol を選び、右で用途・props・短い usage を読む構成です。
          </p>
          <pre>
            <code>{`mountPapyrDocumentViewer(node, {
  document,
  markdownSource,
});`}</code>
          </pre>
        </div>
      </div>
    </article>
  );
}

function DashboardPattern() {
  return (
    <article
      className="design-system-pattern design-system-pattern--dashboard"
      aria-labelledby="dashboard-pattern-title"
    >
      <header className="design-system-pattern__bar">
        <span className="design-system-tag design-system-tag--accent">P3</span>
        <span className="eyebrow">dashboard</span>
        <span
          className="design-system-pattern__bar-spacer"
          aria-hidden="true"
        />
        <Status tone="info" label="last 24h" />
      </header>
      <div className="design-system-dashboard__header">
        <h3 id="dashboard-pattern-title">Dashboard overview pattern</h3>
        <input
          type="search"
          aria-label="Filter documents"
          placeholder="Filter documents"
        />
      </div>
      <div className="design-system-dashboard__stats">
        <Metric label="drafts" value="12" trend="up" />
        <Metric label="reviews" value="4" trend="down" />
        <Metric label="exports" value="8" trend="up" />
      </div>
      <div className="design-system-dashboard__activity">
        {[
          { label: "Updated slide deck", tone: "ok" as StatusTone },
          { label: "Reviewed Moonlight block", tone: "info" as StatusTone },
          { label: "Published viewer preview", tone: "warn" as StatusTone },
        ].map((item) => (
          <div key={item.label} className="design-system-activity-row">
            <span className="design-system-activity-row__main">
              <span
                className={`design-system-dot design-system-dot--${item.tone}`}
                aria-hidden="true"
              />
              {item.label}
            </span>
            <small>just now</small>
          </div>
        ))}
      </div>
    </article>
  );
}

type StatusTone = "ok" | "info" | "warn";

function Status({ tone, label }: { tone: StatusTone; label: string }) {
  return (
    <span className={`design-system-status design-system-status--${tone}`}>
      <span
        className={`design-system-dot design-system-dot--${tone}`}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function Metric({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: "up" | "down" | "stable" | "locked";
}) {
  const glyph =
    trend === "up"
      ? "▲"
      : trend === "down"
        ? "▼"
        : trend === "locked"
          ? "◆"
          : "◇";
  return (
    <div
      className={`design-system-metric design-system-metric--${trend ?? "stable"}`}
    >
      <span className="design-system-metric__head">
        <span>{label}</span>
        <span className="design-system-metric__trend" aria-hidden="true">
          {glyph}
        </span>
      </span>
      <strong>{value}</strong>
    </div>
  );
}

function parseDesignDocument(
  source: string,
):
  | { document: PapyrDocument; error: null }
  | { document: PapyrDocument; error: string } {
  try {
    return {
      document: parseMarkdown(source, { documentId: DESIGN_DOCUMENT_ID }),
      error: null,
    };
  } catch (error) {
    return {
      document: {
        id: DESIGN_DOCUMENT_ID,
        title: "Invalid design source",
        blocks: [],
      },
      error:
        error instanceof Error
          ? error.message
          : "Source の parse に失敗しました。",
    };
  }
}

function mountPreview(
  container: HTMLElement,
  mount: () => Promise<MountedPapyrView>,
  onError: (message: string) => void,
): () => void {
  let disposed = false;
  let mounted: MountedPapyrView | null = null;

  onError("");
  void mount()
    .then((view) => {
      if (disposed) {
        view.dispose();
        return;
      }
      mounted = view;
    })
    .catch((error: unknown) => {
      if (!disposed) {
        onError(
          error instanceof Error
            ? error.message
            : "Preview の初期化に失敗しました。",
        );
      }
    });

  return () => {
    disposed = true;
    mounted?.dispose();
    container.replaceChildren();
  };
}
