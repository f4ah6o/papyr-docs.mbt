import type {
  Block,
  Inline,
  ListBlock,
  ListItem,
  PapyrDocument,
} from "@f12o/papyr-core";
import { blockPayload, isBlockKind } from "@f12o/papyr-core";

function inlineText(inline: Inline[]): string {
  return inline.map((i) => i.text).join("");
}

function listItemText(item: ListItem): string {
  return item.blocks.map(blockText).join("\n");
}

function listText(list: ListBlock): string {
  return blockPayload(list).items.map(listItemText).join("\n");
}

export function blockText(block: Block): string {
  switch (block[0]) {
    case "Paragraph":
    case "Heading":
      return inlineText(block[1].content);
    case "List":
      return listText(block);
    case "Code":
      return block[1].source;
    case "Mermaid":
      return block[1].source;
    case "Table":
      return block[1].rows
        .flat()
        .map((c) => c.text)
        .join(" ");
    case "Moonlight":
      return [block[1].caption, ...svgTextContent(block[1].svg)]
        .filter(Boolean)
        .join(" ");
  }
}

export type BlockSnapshotType = Lowercase<Block[0]>;

export interface BlockSnapshot {
  id: string;
  type: BlockSnapshotType;
  text: string;
}

export interface IndexableDocument {
  id: string;
  title: string;
  /** Concatenated heading text. Boosted higher than body in default config. */
  headings: string;
  body: string;
  /** Per-block extraction, useful for snippet/anchor generation. */
  blocks: BlockSnapshot[];
}

function flattenBlock(block: Block): Block[] {
  if (!isBlockKind(block, "List")) return [block];
  return [
    block,
    ...block[1].items.flatMap((item) => item.blocks.flatMap(flattenBlock)),
  ];
}

export function toIndexable(doc: PapyrDocument): IndexableDocument {
  const allBlocks = doc.blocks.flatMap(flattenBlock);
  const blocks: BlockSnapshot[] = allBlocks.map((b) => ({
    id: b[1].id,
    type: blockSnapshotType(b),
    text: blockText(b),
  }));
  const headings = allBlocks
    .filter((b) => isBlockKind(b, "Heading"))
    .map(blockText)
    .join("\n");
  return {
    id: doc.id,
    title: doc.title ?? "",
    headings,
    body: doc.blocks.map(blockText).join("\n"),
    blocks,
  };
}

function blockSnapshotType(block: Block): BlockSnapshotType {
  return block[0].toLowerCase() as BlockSnapshotType;
}

function svgTextContent(svg: string): string[] {
  return Array.from(
    svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/gi),
    ([, value]) =>
      decodeBasicEntities(
        String(value)
          .replace(/<[^>]+>/g, "")
          .trim(),
      ),
  ).filter((value) => value.length > 0);
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Returns a short fragment of `text` around the first occurrence of any term in `query`.
 * Case-insensitive. Returns null if no term matches.
 */
export function extractSnippet(
  text: string,
  query: string,
  context = 40,
): string | null {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (terms.length === 0) return null;
  const lower = text.toLowerCase();
  let earliest = -1;
  let matchedTerm = "";
  for (const term of terms) {
    const idx = lower.indexOf(term);
    if (idx >= 0 && (earliest < 0 || idx < earliest)) {
      earliest = idx;
      matchedTerm = term;
    }
  }
  if (earliest < 0) return null;
  const start = Math.max(0, earliest - context);
  const end = Math.min(text.length, earliest + matchedTerm.length + context);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end)}${suffix}`;
}
