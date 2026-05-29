import { useEffect, useState } from "react";
import {
  EditorWorkspace,
  createSampleDocumentSource,
} from "@f12o/papyr-editor-ui";
import "@f12o/papyr-editor-ui/styles.css";

const STORAGE_KEY = "papyr-docs:playground-source:v1";
const LEGACY_VSCODE_STORAGE_KEY = "papyr-docs:vscode-editor-source:v1";
const DOCUMENT_ID = "papyr-docs-playground";

export function PlaygroundApp() {
  const [source, setSource] = useState(() => readStoredSource());
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );

  useEffect(() => {
    writeStoredSource(source);
  }, [source]);

  useEffect(() => {
    if (copyState === "idle") return;
    const timeout = window.setTimeout(() => setCopyState("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  const resetPlayground = () => {
    setSource(createSampleDocumentSource());
    setCopyState("idle");
  };

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(source);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };

  return (
    <div className="playground-page">
      <section className="hero hero--compact playground-hero">
        <div className="hero__body">
          <p className="eyebrow">playground</p>
          <h1>Visual editor と Markdown source を同期する Playground</h1>
          <p className="hero__lead">
            見出しや強調を visual editor で編集すると、PapyrDocument を経由して
            Markdown source へ戻ります。 table / Mermaid / Moonlight は editor
            surface 内の embedded preview card として表示され、
            ダブルクリックやダブルタップで focused editor が開きます。
          </p>
        </div>
        <div className="playground-actions">
          <a className="button" href="/playground/advanced" data-link>
            Open advanced app
          </a>
          <button
            type="button"
            className="button button--secondary"
            onClick={resetPlayground}
          >
            Reset sample
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={copyMarkdown}
          >
            {copyState === "copied"
              ? "Copied"
              : copyState === "error"
                ? "Copy failed"
                : "Copy Markdown"}
          </button>
        </div>
      </section>

      <section className="panel playground-note">
        <div>
          <p className="eyebrow">local-only</p>
          <h2>保存先はこのブラウザだけ</h2>
        </div>
        <p>
          内容は localStorage にだけ保存され、server / Worker API
          には送信しません。Markdown source が不正になった場合も、そのまま同じ
          editor surface で修正できます。
        </p>
      </section>

      <section className="panel">
        <p>
          OPFS に記事、設定、asset を保存する advanced playground の実装方針は{" "}
          <a href="/books/advanced-playground/implementation-plan" data-link>
            実装プラン
          </a>{" "}
          にまとめています。
        </p>
      </section>

      <section className="playground-shell">
        <EditorWorkspace
          source={source}
          onSourceChange={setSource}
          documentId={DOCUMENT_ID}
          eyebrow="papyr playground"
          title="Papyr Playground"
          subtitle="local-only"
        />
      </section>
    </div>
  );
}

function readStoredSource(): string {
  if (typeof window === "undefined") return createSampleDocumentSource();

  const current = window.localStorage.getItem(STORAGE_KEY);
  if (current && current.trim().length > 0) return current;

  const legacy = window.localStorage.getItem(LEGACY_VSCODE_STORAGE_KEY);
  if (legacy && legacy.trim().length > 0) return legacy;

  return createSampleDocumentSource();
}

function writeStoredSource(source: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, source);
}
