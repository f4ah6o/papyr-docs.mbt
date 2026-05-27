import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { PapyrDocument } from '@f12o/papyr-core';
import {
  codeBlock,
  excalidrawBlock,
  headingBlock,
  listBlock,
  mermaidBlock,
  paragraphBlock,
  tableBlock,
} from '@f12o/papyr-core';
import {
  fencedTableBlockArbitrary,
  gfmCompatibleTableBlockArbitrary,
  normalizeBlocks,
  papyrDocumentArbitrary,
  safeTextArbitrary,
} from '@f12o/papyr-test-support';
import { documentToProseMirror, proseMirrorToDocument } from './converters.js';

describe('documentToProseMirror', () => {
  it('maps headings, paragraphs, and inline marks', () => {
    const doc: PapyrDocument = {
      id: 'd',
      blocks: [
        headingBlock({ id: 'h', level: 2, content: [{ text: 'Title' }] }),
        paragraphBlock({
          id: 'p',
          content: [
            { text: 'see ' },
            { text: 'docs', marks: ['link'], href: 'https://x' },
            { text: '.' },
          ],
        }),
      ],
    };
    const pm = documentToProseMirror(doc);
    expect(pm.type).toBe('doc');
    expect(pm.content?.[0]).toEqual({
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Title' }],
    });
    const linkRun = pm.content?.[1]?.content?.[1];
    expect(linkRun?.marks).toEqual([{ type: 'link', attrs: { href: 'https://x' } }]);
  });

  it('maps papyr-specific blocks to custom nodes', () => {
    const pm = documentToProseMirror({
      id: 'd',
      blocks: [
        tableBlock({
          id: 't',
          columns: [{ key: 'a', header: 'A' }],
          rows: [[{ text: '1' }]],
        }),
        mermaidBlock({ id: 'm', source: 'graph TD; A-->B;' }),
      ],
    });
    expect(pm.content?.[0]?.type).toBe('papyrTable');
    expect(pm.content?.[0]?.attrs?.id).toBe('t');
    expect(pm.content?.[0]?.attrs?.data).toMatchObject({
      columns: [{ key: 'a', header: 'A' }],
    });
    expect(pm.content?.[1]?.type).toBe('papyrMermaid');
    expect(pm.content?.[1]?.attrs?.id).toBe('m');
    expect(pm.content?.[1]?.attrs?.source).toBe('graph TD; A-->B;');
  });
});

describe('proseMirrorToDocument', () => {
  it('round-trips through documentToProseMirror', () => {
    const original: PapyrDocument = {
      id: 'd',
      blocks: [
        headingBlock({ id: 'b1', level: 1, content: [{ text: 'Top' }] }),
        paragraphBlock({
          id: 'b2',
          content: [{ text: 'hello ' }, { text: 'world', marks: ['bold'] }],
        }),
        listBlock({
          id: 'b3',
          ordered: false,
          items: [
            { blocks: [paragraphBlock({ id: 'b3-1', content: [{ text: 'one' }] })] },
            { blocks: [paragraphBlock({ id: 'b3-2', content: [{ text: 'two' }] })] },
          ],
        }),
        tableBlock({
          id: 'b4',
          columns: [{ key: 'a', header: 'A' }],
          rows: [[{ text: 'x' }]],
        }),
        mermaidBlock({ id: 'b5', source: 'graph TD; A-->B;' }),
      ],
    };
    const pm = documentToProseMirror(original);
    const back = proseMirrorToDocument(pm, 'd');
    expect(back.blocks.map((b) => b[0])).toEqual(original.blocks.map((b) => b[0]));
    const heading = back.blocks[0];
    if (heading?.[0] !== 'Heading') throw new Error('expected heading');
    expect(heading[1].level).toBe(1);
    const list = back.blocks[2];
    if (list?.[0] !== 'List') throw new Error('expected list');
    expect(list[1].items).toHaveLength(2);
    const table = back.blocks[3];
    if (table?.[0] !== 'Table') throw new Error('expected table');
    expect(table[1].rows).toEqual([[{ text: 'x' }]]);
  });

  it('round-trips arbitrary block sequences inside a list item', () => {
    const original: PapyrDocument = {
      id: 'd',
      blocks: [
        listBlock({
          id: 'l1',
          ordered: false,
          items: [
            {
              blocks: [
                headingBlock({ id: 'h1', level: 3, content: [{ text: 'Nested heading' }] }),
                paragraphBlock({ id: 'p1', content: [{ text: 'Body' }] }),
                codeBlock({ id: 'c1', language: 'ts', source: 'console.log(1)' }),
                tableBlock({
                  id: 't1',
                  columns: [{ key: 'a', header: 'A' }],
                  rows: [[{ text: '1' }]],
                }),
                mermaidBlock({ id: 'm1', source: 'graph TD; A-->B;' }),
                excalidrawBlock({ id: 'e1', elements: [{ text: 'Sketch' }] }),
                listBlock({
                  id: 'l2',
                  ordered: true,
                  items: [
                    {
                      blocks: [paragraphBlock({ id: 'p2', content: [{ text: 'Deep child' }] })],
                    },
                  ],
                }),
              ],
            },
          ],
        }),
      ],
    };
    const pm = documentToProseMirror(original);
    const itemContent = pm.content?.[0]?.content?.[0]?.content ?? [];
    expect(itemContent.map((node) => node.type)).toEqual([
      'heading',
      'paragraph',
      'codeBlock',
      'papyrTable',
      'papyrMermaid',
      'papyrExcalidraw',
      'orderedList',
    ]);

    const back = proseMirrorToDocument(pm, 'd');
    const list = back.blocks[0];
    if (list?.[0] !== 'List') throw new Error('expected list');
    expect(list[1].items[0]?.blocks.map((block) => block[0])).toEqual([
      'Heading',
      'Paragraph',
      'Code',
      'Table',
      'Mermaid',
      'Excalidraw',
      'List',
    ]);
  });

  it('clamps invalid heading levels into the 1..6 range', () => {
    const back = proseMirrorToDocument(
      {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 99 }, content: [{ type: 'text', text: 'X' }] },
        ],
      },
      'd',
    );
    const heading = back.blocks[0];
    if (heading?.[0] !== 'Heading') throw new Error('expected heading');
    expect(heading[1].level).toBe(6);
  });

  it('preserves custom block ids through a ProseMirror round trip', () => {
    const back = proseMirrorToDocument(
      {
        type: 'doc',
        content: [
          {
            type: 'papyrMermaid',
            attrs: {
              id: 'diagram-1',
              source: 'graph TD; A-->B;',
              caption: 'Flow',
            },
          },
          {
            type: 'papyrExcalidraw',
            attrs: {
              id: 'diagram-2',
              data: {
                elements: [{ type: 'rectangle', x: 0, y: 0 }],
                caption: 'Sketch',
              },
            },
          },
        ],
      },
      'd',
    );

    expect(back.blocks[0]).toMatchObject(['Mermaid', { id: 'diagram-1' }]);
    expect(back.blocks[1]).toMatchObject(['Excalidraw', { id: 'diagram-2' }]);
  });
});

describe('property-based converter invariants', () => {
  it('round-trips generated documents when ids are normalized away', () => {
    fc.assert(
      fc.property(papyrDocumentArbitrary({ maxBlocks: 4, maxDepth: 2 }), (original) => {
        const back = proseMirrorToDocument(documentToProseMirror(original), original.id);
        expect(normalizeBlocks(back.blocks)).toEqual(normalizeBlocks(original.blocks));
      }),
      { numRuns: 40 },
    );
  });

  it('preserves generated custom block ids through a ProseMirror round trip', () => {
    const customBlockArbitrary = fc.oneof(
      gfmCompatibleTableBlockArbitrary.map((block) => tableBlock({ ...block[1], id: 'table-custom' })),
      fencedTableBlockArbitrary.map((block) => tableBlock({ ...block[1], id: 'table-fenced' })),
      safeTextArbitrary.map((source) => mermaidBlock({
        id: 'mermaid-custom',
        source,
      })),
      safeTextArbitrary.map((caption) => excalidrawBlock({
        id: 'excalidraw-custom',
        elements: [{ type: 'rectangle', x: 0, y: 0, text: caption }],
      })),
    );

    fc.assert(
      fc.property(customBlockArbitrary, (block) => {
        const back = proseMirrorToDocument(
          documentToProseMirror({ id: 'd', blocks: [block] }),
          'd',
        );
        expect(back.blocks[0]).toMatchObject([block[0], { id: block[1].id }]);
      }),
      { numRuns: 40 },
    );
  });

  it('clamps arbitrary heading levels into the supported range', () => {
    fc.assert(
      fc.property(fc.integer({ min: -50, max: 50 }), (level) => {
        const back = proseMirrorToDocument(
          {
            type: 'doc',
            content: [
              { type: 'heading', attrs: { level }, content: [{ type: 'text', text: 'X' }] },
            ],
          },
          'd',
        );
        const heading = back.blocks[0];
        if (heading?.[0] !== 'Heading') throw new Error('expected heading');
        expect(heading[1].level).toBeGreaterThanOrEqual(1);
        expect(heading[1].level).toBeLessThanOrEqual(6);
      }),
      { numRuns: 40 },
    );
  });
});
