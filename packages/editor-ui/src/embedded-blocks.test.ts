import { describe, expect, it } from 'vitest';
import type { PapyrDocument } from '@f12o/papyr-core';
import {
  excalidrawBlock,
  headingBlock,
  listBlock,
  mermaidBlock,
  paragraphBlock,
  tableBlock,
} from '@f12o/papyr-core';
import {
  collectEmbeddedPreviewBlocks,
  embeddedBlockId,
  embeddedBlockType,
  getEmbeddedBlockEditorTitle,
  normalizeEditableTableColumns,
} from './embedded-blocks.js';

describe('collectEmbeddedPreviewBlocks', () => {
  it('keeps embedded blocks in document order across nested lists', () => {
    const doc: PapyrDocument = {
      id: 'doc',
      blocks: [
        headingBlock({
          id: 'heading-1',
          level: 1,
          content: [{ text: 'Title' }],
        }),
        listBlock({
          id: 'list-1',
          ordered: false,
          items: [
            {
              blocks: [
                tableBlock({
                  id: 'table-1',
                  columns: [{ key: 'step', header: 'Step' }],
                  rows: [[{ text: 'Draft' }]],
                }),
              ],
            },
            {
              blocks: [
                paragraphBlock({
                  id: 'paragraph-1',
                  content: [{ text: 'Body' }],
                }),
                mermaidBlock({
                  id: 'mermaid-1',
                  source: 'graph TD\n  A --> B',
                }),
              ],
            },
          ],
        }),
        excalidrawBlock({
          id: 'excalidraw-1',
          elements: [],
        }),
      ],
    };

    expect(
      collectEmbeddedPreviewBlocks(doc).map((block) => [
        embeddedBlockType(block),
        embeddedBlockId(block),
      ]),
    ).toEqual([
      ['table', 'table-1'],
      ['mermaid', 'mermaid-1'],
      ['excalidraw', 'excalidraw-1'],
    ]);
  });
});

describe('normalizeEditableTableColumns', () => {
  it('preserves an existing stable key when the header changes', () => {
    expect(
      normalizeEditableTableColumns([
        { key: 'stable-owner', header: 'Review owner' },
        { key: 'stable-status', header: 'Status' },
      ]),
    ).toEqual([
      { key: 'stable-owner', header: 'Review owner' },
      { key: 'stable-status', header: 'Status' },
    ]);
  });

  it('falls back to header-derived keys for new columns and deduplicates them', () => {
    expect(
      normalizeEditableTableColumns([
        { key: '', header: 'Status' },
        { key: '', header: 'Status' },
      ]).map((column) => column.key),
    ).toEqual(['status', 'status-2']);
  });
});

describe('getEmbeddedBlockEditorTitle', () => {
  it('returns the user-facing title for each editor type', () => {
    expect(getEmbeddedBlockEditorTitle('table')).toBe('Table editor');
    expect(getEmbeddedBlockEditorTitle('mermaid')).toBe('Mermaid editor');
    expect(getEmbeddedBlockEditorTitle('excalidraw')).toBe('Excalidraw editor');
  });
});
