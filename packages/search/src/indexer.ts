import type { Block, Inline, PapyrDocument } from '@f12o/papyr-core';
import {
  searchBlockTextJson,
  searchExtractSnippetJson,
  searchToIndexableJson,
} from '@f12o/papyr-moonbit-bridge';

interface MoonBitBlockSnapshot {
  id: string;
  kind: BlockSnapshotType;
  text: string;
}

interface MoonBitIndexableDocument {
  id: string;
  title: string;
  headings: string;
  body: string;
  blocks: MoonBitBlockSnapshot[];
}

export function blockText(block: Block): string {
  return searchBlockTextJson(canonicalBlockForMoonBit(block));
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

export function toIndexable(doc: PapyrDocument): IndexableDocument {
  const result = searchToIndexableJson<MoonBitIndexableDocument>(canonicalDocumentForMoonBit(doc));
  return {
    ...result,
    blocks: result.blocks.map((block) => ({
      id: block.id,
      type: block.kind,
      text: block.text,
    })),
  };
}

/**
 * Returns a short fragment of `text` around the first occurrence of any term in `query`.
 * Case-insensitive. Returns null if no term matches.
 */
export function extractSnippet(text: string, query: string, context = 40): string | null {
  return searchExtractSnippetJson(text, query, context);
}

function canonicalDocumentForMoonBit(doc: PapyrDocument): PapyrDocument {
  return { ...doc, blocks: doc.blocks.map(canonicalBlockForMoonBit) };
}

function canonicalBlockForMoonBit(block: Block): Block {
  switch (block[0]) {
    case 'Heading':
      return ['Heading', { ...block[1], content: canonicalInlineForMoonBit(block[1].content) }];
    case 'Paragraph':
      return ['Paragraph', { ...block[1], content: canonicalInlineForMoonBit(block[1].content) }];
    case 'List':
      return [
        'List',
        {
          ...block[1],
          items: block[1].items.map((item) => ({
            ...item,
            blocks: item.blocks.map(canonicalBlockForMoonBit),
          })),
        },
      ];
    default:
      return block;
  }
}

function canonicalInlineForMoonBit(runs: Inline[]): Inline[] {
  return runs.map((run) => ({
    ...run,
    marks: run.marks ?? [],
  }));
}
