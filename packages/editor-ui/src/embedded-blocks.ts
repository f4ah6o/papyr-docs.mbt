import type {
  Block,
  ExcalidrawBlock,
  MermaidBlock,
  PapyrDocument,
  TableBlock,
} from '@f12o/papyr-core';
import { isBlockKind } from '@f12o/papyr-core';

export type EditableEmbeddedBlock = TableBlock | MermaidBlock | ExcalidrawBlock;
export type EditableEmbeddedBlockType = 'table' | 'mermaid' | 'excalidraw';

export function collectEmbeddedPreviewBlocks(doc: PapyrDocument): EditableEmbeddedBlock[] {
  const result: EditableEmbeddedBlock[] = [];
  collectBlocks(doc.blocks, result);
  return result;
}

export function getEmbeddedBlockEditorTitle(type: EditableEmbeddedBlockType): string {
  switch (type) {
    case 'mermaid':
      return 'Mermaid editor';
    case 'table':
      return 'Table editor';
    case 'excalidraw':
      return 'Excalidraw editor';
  }
}

export function normalizeEditableTableColumns(
  columns: ReadonlyArray<TableBlock[1]['columns'][number]>,
): TableBlock[1]['columns'] {
  const usedKeys = new Set<string>();
  return columns.map((column, index) => {
    const base =
      normalizeTableColumnKey(column.key) ||
      normalizeTableColumnKey(column.header) ||
      `column-${index + 1}`;
    let key = base;
    let suffix = 2;
    while (usedKeys.has(key)) {
      key = `${base}-${suffix++}`;
    }
    usedKeys.add(key);
    return {
      ...column,
      key,
    };
  });
}

function collectBlocks(blocks: ReadonlyArray<Block>, result: EditableEmbeddedBlock[]): void {
  for (const block of blocks) {
    if (isBlockKind(block, 'List')) {
      for (const item of block[1].items) collectBlocks(item.blocks, result);
      continue;
    }
    if (isEmbeddedPreviewBlock(block)) {
      result.push(block);
    }
  }
}

export function embeddedBlockId(block: EditableEmbeddedBlock): string {
  return block[1].id;
}

export function embeddedBlockType(block: EditableEmbeddedBlock): EditableEmbeddedBlockType {
  return block[0].toLowerCase() as EditableEmbeddedBlockType;
}

export function isEditableTableBlock(
  block: EditableEmbeddedBlock | undefined,
): block is TableBlock {
  return isBlockKind(block, 'Table');
}

export function isEditableMermaidBlock(
  block: EditableEmbeddedBlock | undefined,
): block is MermaidBlock {
  return isBlockKind(block, 'Mermaid');
}

export function isEditableExcalidrawBlock(
  block: EditableEmbeddedBlock | undefined,
): block is ExcalidrawBlock {
  return isBlockKind(block, 'Excalidraw');
}

function isEmbeddedPreviewBlock(block: Block): block is EditableEmbeddedBlock {
  return (
    isBlockKind(block, 'Table') || isBlockKind(block, 'Mermaid') || isBlockKind(block, 'Excalidraw')
  );
}

function normalizeTableColumnKey(value: string): string {
  return value
    .trim()
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}
