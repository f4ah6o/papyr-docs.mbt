import {
  appendBlock,
  createDefaultMoonlightBlock,
  createDefaultMermaidBlock,
} from "@f12o/papyr-editor";
import { moonlightBlock, mermaidBlock, tableBlock } from "@f12o/papyr-core";
import { parseMarkdown, serializeDocument } from "@f12o/papyr-markdown";

const SAMPLE_DOCUMENT_ID = "papyr-editor-workspace-sample";

const SAMPLE_BODY = [
  "# Papyr integrated editor",
  "",
  "Markdown 記号を残したまま style と preview を 1 つの workflow に統合した editor です。",
  "",
  "## Try it",
  "",
  "- Style palette は hidden rich text ではなく Markdown を直接書き換えます",
  "- table / Mermaid / Moonlight の preview card を double click / double tap すると focused editor が開きます",
  "- Add Mermaid / Add Moonlight で diagram block を追加できます",
  "",
  "```ts",
  "console.log('papyr integrated editor');",
  "```",
].join("\n");

export function createSampleDocumentSource(): string {
  const base = parseMarkdown(SAMPLE_BODY, { documentId: SAMPLE_DOCUMENT_ID });

  const defaultMermaid = createDefaultMermaidBlock("mermaid-sample");
  const withMermaid = appendBlock(
    base,
    mermaidBlock({
      ...defaultMermaid[1],
      caption: "Publishing flow",
      source: [
        "graph TD",
        "  Draft --> Review",
        "  Review --> Published",
        "  Review --> Rework",
      ].join("\n"),
    }),
  );

  const withTable = appendBlock(
    withMermaid,
    tableBlock({
      id: "table-sample",
      caption: "Publishing checklist",
      columns: [
        { key: "step", header: "Step" },
        { key: "owner", header: "Owner" },
        { key: "status", header: "Status" },
      ],
      rows: [
        [{ text: "Draft" }, { text: "Writer" }, { text: "Done" }],
        [{ text: "Review" }, { text: "Editor" }, { text: "In progress" }],
        [{ text: "Publish" }, { text: "Ops" }, { text: "Queued" }],
      ],
    }),
  );

  const defaultMoonlight = createDefaultMoonlightBlock("moonlight-sample");
  const withMoonlight = appendBlock(
    withTable,
    moonlightBlock({
      ...defaultMoonlight[1],
      caption: "Review loop",
      svg: [
        '<svg viewBox="0 0 580 120" role="img" aria-label="Review loop" xmlns="http://www.w3.org/2000/svg">',
        '<rect x="20" y="24" width="180" height="72" rx="10" fill="#eef9f6" stroke="#1f6f5f" stroke-width="2" />',
        '<text x="54" y="68" fill="#1f2629" font-size="22">Write draft</text>',
        '<path d="M212 60 H356" fill="none" stroke="#8b5e34" stroke-width="2" marker-end="url(#arrow)" />',
        '<rect x="370" y="24" width="180" height="72" rx="10" fill="#fff5eb" stroke="#8b5e34" stroke-width="2" />',
        '<text x="412" y="68" fill="#1f2629" font-size="22">Review</text>',
        '<defs><marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#8b5e34" /></marker></defs>',
        "</svg>",
      ].join(""),
    }),
  );

  return serializeDocument(withMoonlight);
}
