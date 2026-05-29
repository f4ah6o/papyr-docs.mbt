import type {
  Block,
  MoonlightBlock,
  MermaidBlock,
  PapyrDocument,
  TableBlock,
} from "@f12o/papyr-core";
import { moonlightBlock, isBlockKind, mermaidBlock } from "@f12o/papyr-core";

export type EmbeddedBlock = TableBlock | MermaidBlock | MoonlightBlock;
export type DiagramBlock = MermaidBlock | MoonlightBlock;
export type EmbeddedBlockType = "table" | "mermaid" | "moonlight";

export interface EmbeddedBlockEntry {
  id: string;
  type: EmbeddedBlockType;
  label: string;
  caption?: string;
}

export interface DiagramEntry {
  id: string;
  type: Exclude<EmbeddedBlockType, "table">;
  label: string;
  caption?: string;
}

export function listEmbeddedBlocks(doc: PapyrDocument): EmbeddedBlockEntry[] {
  const entries: EmbeddedBlockEntry[] = [];
  collectEmbeddedBlocks(doc.blocks, entries);
  return entries;
}

export function findEmbeddedBlock(
  doc: PapyrDocument,
  id: string,
): EmbeddedBlock | undefined {
  return findInBlocks(doc.blocks, id);
}

export function updateEmbeddedBlock(
  doc: PapyrDocument,
  id: string,
  updater: (block: EmbeddedBlock) => EmbeddedBlock,
): PapyrDocument {
  const blocks = updateBlocks(doc.blocks, id, updater);
  if (blocks === doc.blocks) return doc;
  return { ...doc, blocks };
}

export function listDiagramBlocks(doc: PapyrDocument): DiagramEntry[] {
  return listEmbeddedBlocks(doc).flatMap((entry) =>
    entry.type === "table"
      ? []
      : [
          {
            id: entry.id,
            type: entry.type,
            label: entry.label,
            caption: entry.caption,
          },
        ],
  );
}

export function findDiagramBlock(
  doc: PapyrDocument,
  id: string,
): DiagramBlock | undefined {
  const block = findEmbeddedBlock(doc, id);
  return block && isDiagramBlock(block) ? block : undefined;
}

export function updateDiagramBlock(
  doc: PapyrDocument,
  id: string,
  updater: (block: DiagramBlock) => DiagramBlock,
): PapyrDocument {
  const target = findEmbeddedBlock(doc, id);
  if (!target || !isDiagramBlock(target)) return doc;
  return updateEmbeddedBlock(doc, id, (block) =>
    isDiagramBlock(block) ? updater(block) : block,
  );
}

export function appendBlock(doc: PapyrDocument, block: Block): PapyrDocument {
  return {
    ...doc,
    blocks: [...doc.blocks, block],
  };
}

export function createDefaultMermaidBlock(
  id = createBlockId("mermaid"),
): MermaidBlock {
  return mermaidBlock({
    id,
    source: ["graph TD", "  Draft --> Review", "  Review --> Publish"].join(
      "\n",
    ),
    caption: "New Mermaid diagram",
  });
}

export function createDefaultMoonlightBlock(
  id = createBlockId("moonlight"),
): MoonlightBlock {
  return moonlightBlock({
    id,
    svg: "",
    caption: "新しい Moonlight 図",
  });
}

export function createBlockId(prefix: string): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function collectEmbeddedBlocks(
  blocks: Block[],
  entries: EmbeddedBlockEntry[],
): void {
  for (const block of blocks) {
    if (isBlockKind(block, "List")) {
      for (const item of block[1].items)
        collectEmbeddedBlocks(item.blocks, entries);
      continue;
    }
    if (isEmbeddedBlock(block)) {
      const payload = block[1];
      entries.push({
        id: payload.id,
        type: embeddedBlockType(block),
        label: describeEmbeddedBlock(block),
        ...(payload.caption !== undefined && { caption: payload.caption }),
      });
    }
  }
}

function findInBlocks(blocks: Block[], id: string): EmbeddedBlock | undefined {
  for (const block of blocks) {
    if (isBlockKind(block, "List")) {
      for (const item of block[1].items) {
        const nested = findInBlocks(item.blocks, id);
        if (nested) return nested;
      }
      continue;
    }
    if (isEmbeddedBlock(block) && block[1].id === id) {
      return block;
    }
  }
  return undefined;
}

function updateBlocks(
  blocks: Block[],
  id: string,
  updater: (block: EmbeddedBlock) => EmbeddedBlock,
): Block[] {
  let changed = false;
  const nextBlocks = blocks.map((block) => {
    if (isBlockKind(block, "List")) {
      let itemsChanged = false;
      const items = block[1].items.map((item) => {
        const nextItemBlocks = updateBlocks(item.blocks, id, updater);
        if (nextItemBlocks !== item.blocks) {
          itemsChanged = true;
          return { ...item, blocks: nextItemBlocks };
        }
        return item;
      });
      if (!itemsChanged) return block;
      changed = true;
      return ["List", { ...block[1], items }] as Block;
    }

    if (isEmbeddedBlock(block) && block[1].id === id) {
      changed = true;
      return updater(block);
    }

    return block;
  });

  return changed ? nextBlocks : blocks;
}

function isEmbeddedBlock(block: Block): block is EmbeddedBlock {
  return (
    isBlockKind(block, "Table") ||
    isBlockKind(block, "Mermaid") ||
    isBlockKind(block, "Moonlight")
  );
}

function isDiagramBlock(block: EmbeddedBlock): block is DiagramBlock {
  return isBlockKind(block, "Mermaid") || isBlockKind(block, "Moonlight");
}

function describeEmbeddedBlock(block: EmbeddedBlock): string {
  if (isBlockKind(block, "Table")) {
    if (block[1].caption) return block[1].caption;
    return `Table (${block[1].columns.length} columns, ${block[1].rows.length} rows)`;
  }
  if (isBlockKind(block, "Mermaid")) {
    if (block[1].caption) return block[1].caption;
    return (
      block[1].source.split("\n").find((line) => line.trim().length > 0) ??
      "Mermaid diagram"
    );
  }
  if (block[1].caption) return block[1].caption;
  return block[1].svg.trim().length > 0 ? "Moonlight SVG" : "Moonlight diagram";
}

function embeddedBlockType(block: EmbeddedBlock): EmbeddedBlockType {
  return block[0].toLowerCase() as EmbeddedBlockType;
}
