import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type {
  Block,
  CodeBlock,
  ExcalidrawBlock,
  HeadingBlock,
  ListBlock,
  MermaidBlock,
  PapyrDocument,
  ParagraphBlock,
  TableBlock,
} from '@f12o/papyr-core';
import {
  fencedTableBlockArbitrary,
  gfmCompatibleTableBlockArbitrary,
  normalizeBlocks,
  papyrDocumentArbitrary,
  safeTextArbitrary,
} from '@f12o/papyr-test-support';
import { assertPapyrMarkdownSubset, parseMarkdown } from './parse.js';
import { serializeDocument } from './serialize.js';

function paragraphBlock(payload: ParagraphBlock[1]): ParagraphBlock {
  return ['Paragraph', payload];
}

function headingBlock(payload: HeadingBlock[1]): HeadingBlock {
  return ['Heading', payload];
}

function listBlock(payload: ListBlock[1]): ListBlock {
  return ['List', payload];
}

function codeBlock(payload: CodeBlock[1]): CodeBlock {
  return ['Code', payload];
}

function tableBlock(payload: TableBlock[1]): TableBlock {
  return ['Table', payload];
}

function mermaidBlock(payload: MermaidBlock[1]): MermaidBlock {
  return ['Mermaid', payload];
}

function excalidrawBlock(payload: ExcalidrawBlock[1]): ExcalidrawBlock {
  return ['Excalidraw', payload];
}

function isBlockKind<TKind extends Block[0]>(
  block: Block | undefined,
  kind: TKind,
): block is Extract<Block, [TKind, unknown]> {
  return block?.[0] === kind;
}

describe('parseMarkdown', () => {
  it('parses headings and paragraphs', () => {
    const doc = parseMarkdown('# Hello\n\nWorld.');
    expect(doc.blocks).toEqual([
      headingBlock({
        id: 'b1',
        level: 1,
        content: [{ text: 'Hello' }],
      }),
      paragraphBlock({
        id: 'b2',
        content: [{ text: 'World.' }],
      }),
    ]);
  });

  it('parses inline marks', () => {
    const doc = parseMarkdown('**bold** and _italic_ and `code` and ~~strike~~.');
    const paragraph = doc.blocks[0];
    expect(paragraph?.[0]).toBe('Paragraph');
    if (!isBlockKind(paragraph, 'Paragraph')) throw new Error('expected paragraph');
    expect(paragraph[1].content).toEqual([
      { text: 'bold', marks: ['bold'] },
      { text: ' and ' },
      { text: 'italic', marks: ['italic'] },
      { text: ' and ' },
      { text: 'code', marks: ['code'] },
      { text: ' and ' },
      { text: 'strike', marks: ['strike'] },
      { text: '.' },
    ]);
  });

  it('decodes papyr-table fences to JSON table blocks', () => {
    const input = [
      '```papyr-table',
      JSON.stringify({
        columns: [{ key: 'n', header: 'N' }],
        rows: [[{ text: '1' }]],
      }),
      '```',
    ].join('\n');
    const doc = parseMarkdown(input);
    expect(doc.blocks[0]).toEqual(tableBlock({
      id: 'b1',
      columns: [{ key: 'n', header: 'N' }],
      rows: [[{ text: '1' }]],
    }));
  });

  it('parses GFM tables into table blocks', () => {
    const doc = parseMarkdown(
      ['| Name | Score |', '| :--- | ----: |', '| Alice | 42 |', '| Bob | 99 |'].join('\n'),
    );

    expect(doc.blocks[0]).toEqual(tableBlock({
      id: 'b1',
      columns: [
        { key: 'name', header: 'Name', align: 'left' },
        { key: 'score', header: 'Score', align: 'right' },
      ],
      rows: [
        [{ text: 'Alice' }, { text: '42' }],
        [{ text: 'Bob' }, { text: '99' }],
      ],
    }));
  });

  it('decodes mermaid fences', () => {
    const doc = parseMarkdown('```mermaid\ngraph TD; A-->B;\n```');
    expect(doc.blocks[0]).toEqual(mermaidBlock({ id: 'b1', source: 'graph TD; A-->B;' }));
  });

  it('rejects footnotes instead of silently dropping them', () => {
    expect(() => parseMarkdown('[^1]: footnote\n\n[^1]')).toThrow(
      'Unsupported Markdown block: footnoteDefinition',
    );
  });

  it('rejects task list items instead of treating them as plain lists', () => {
    expect(() => parseMarkdown('- [x] todo\n')).toThrow('Unsupported Markdown block: taskListItem');
  });

  it('assertPapyrMarkdownSubset rejects footnotes', () => {
    expect(() => assertPapyrMarkdownSubset('[^1]: footnote\n\n[^1]')).toThrow(
      'Unsupported Markdown block: footnoteDefinition',
    );
  });

  it('assertPapyrMarkdownSubset rejects task list items', () => {
    expect(() => assertPapyrMarkdownSubset('- [x] todo\n')).toThrow(
      'Unsupported Markdown block: taskListItem',
    );
  });

  it('rejects images in table cells instead of silently dropping them', () => {
    const md = '| Header |\n| ------ |\n| ![alt](image.png) |';
    expect(() => parseMarkdown(md)).toThrow('Unsupported Markdown inline: image');
  });

  it('rejects HTML in table cells instead of silently dropping it', () => {
    const md = '| Header |\n| ------ |\n| <span>html</span> |';
    expect(() => parseMarkdown(md)).toThrow('Unsupported Markdown inline: html');
  });

  it('rejects footnote references in table cells instead of silently dropping them', () => {
    const md = '[^1]: footnote\n\n| Header |\n| ------ |\n| text[^1] |';
    expect(() => parseMarkdown(md)).toThrow('Unsupported Markdown');
  });

  it('rejects images in nested table cells within list items', () => {
    const md = '- item\n\n  | Header |\n  | ------ |\n  | ![alt](img.png) |';
    expect(() => parseMarkdown(md)).toThrow('Unsupported Markdown inline: image');
  });

  it('accepts supported inline content in table cells', () => {
    const md = '| Header |\n| ------ |\n| **bold** _italic_ `code` ~~strike~~ [link](url) |';
    const doc = parseMarkdown(md);
    expect(doc.blocks[0]?.[0]).toBe('Table');
  });
});

describe('serializeDocument', () => {
  it('emits markdown for a mixed document', () => {
    const doc: PapyrDocument = {
      id: 'd',
      blocks: [
        headingBlock({ id: 'h', level: 2, content: [{ text: 'Title' }] }),
        paragraphBlock({ id: 'p', content: [{ text: 'hello' }] }),
        mermaidBlock({ id: 'm', source: 'graph TD; A-->B;' }),
      ],
    };
    const md = serializeDocument(doc);
    expect(md).toContain('## Title');
    expect(md).toContain('hello');
    expect(md).toContain('```mermaid');
    expect(md).toContain('graph TD; A-->B;');
  });

  it('emits GFM tables for simple table blocks', () => {
    const md = serializeDocument({
      id: 'd',
      blocks: [
        tableBlock({
          id: 't',
          columns: [
            { key: 'name', header: 'Name', align: 'left' },
            { key: 'score', header: 'Score', align: 'right' },
          ],
          rows: [[{ text: 'Alice' }, { text: '42' }]],
        }),
      ],
    });
    expect(md).toContain('| Name  | Score |');
    expect(md).toContain('| :---- | ----: |');
    expect(md).toContain('| Alice |    42 |');
    expect(md).not.toContain('```papyr-table');
  });

  it('keeps papyr-table fences for complex table blocks', () => {
    const md = serializeDocument({
      id: 'd',
      blocks: [
        tableBlock({
          id: 't',
          caption: 'Summary',
          columns: [{ key: 'n', header: 'N' }],
          rows: [[{ text: '1', colspan: 1 }]],
        }),
      ],
    });
    expect(md).toContain('```papyr-table');
    expect(md).toContain('"caption": "Summary"');
  });

  it('keeps papyr-table fences for tables with non-derivable column keys', () => {
    const md = serializeDocument({
      id: 'd',
      blocks: [
        tableBlock({
          id: 't',
          columns: [
            { key: 'first_name', header: 'Name' },
            { key: 'score_raw', header: 'Score' },
          ],
          rows: [[{ text: 'Alice' }, { text: '42' }]],
        }),
      ],
    });
    expect(md).toContain('```papyr-table');
    expect(md).toContain('"first_name"');
    expect(md).toContain('"score_raw"');
  });

  it('keeps simple list items tight when each item has a single paragraph', () => {
    const md = serializeDocument({
      id: 'd',
      blocks: [
        listBlock({
          id: 'l1',
          ordered: false,
          items: [
            { blocks: [paragraphBlock({ id: 'p1', content: [{ text: 'one' }] })] },
            { blocks: [paragraphBlock({ id: 'p2', content: [{ text: 'two' }] })] },
          ],
        }),
      ],
    });

    expect(md).toBe('* one\n* two\n');
  });

  it('serializes multi-block list items as loose lists with blank lines', () => {
    const md = serializeDocument({
      id: 'd',
      blocks: [
        listBlock({
          id: 'l1',
          ordered: false,
          items: [
            {
              blocks: [
                paragraphBlock({ id: 'p1', content: [{ text: 'intro' }] }),
                paragraphBlock({ id: 'p2', content: [{ text: 'tail' }] }),
              ],
            },
            { blocks: [paragraphBlock({ id: 'p3', content: [{ text: 'next' }] })] },
          ],
        }),
      ],
    });

    expect(md).toBe('* intro\n\n  tail\n\n* next\n');
  });

  it('serializes non-paragraph list item blocks as loose lists', () => {
    const md = serializeDocument({
      id: 'd',
      blocks: [
        listBlock({
          id: 'l1',
          ordered: false,
          items: [
            {
              blocks: [
                headingBlock({ id: 'h1', level: 2, content: [{ text: 'Nested title' }] }),
                paragraphBlock({ id: 'p1', content: [{ text: 'body' }] }),
              ],
            },
          ],
        }),
      ],
    });

    expect(md).toBe('* ## Nested title\n\n  body\n');
  });
});

describe('parse/serialize round-trip', () => {
  it('round-trips a document with table, mermaid, paragraphs', () => {
    const original: PapyrDocument = {
      id: 'd',
      blocks: [
        headingBlock({ id: 'b1', level: 1, content: [{ text: 'Report' }] }),
        paragraphBlock({
          id: 'b2',
          content: [{ text: 'See ' }, { text: 'table', marks: ['bold'] }, { text: ' below.' }],
        }),
        tableBlock({
          id: 'b3',
          columns: [
            { key: 'a', header: 'A' },
            { key: 'b', header: 'B' },
          ],
          rows: [
            [{ text: '1' }, { text: '2' }],
            [{ text: '3' }, { text: '4' }],
          ],
        }),
        mermaidBlock({ id: 'b4', source: 'graph TD; A-->B;' }),
      ],
    };
    const md = serializeDocument(original);
    const reparsed = parseMarkdown(md, { documentId: 'd' });
    expect(reparsed.blocks).toHaveLength(original.blocks.length);
    expect(reparsed.blocks.map((b) => b[0])).toEqual([
      'Heading',
      'Paragraph',
      'Table',
      'Mermaid',
    ]);
    const reTable = reparsed.blocks[2];
    if (!isBlockKind(reTable, 'Table')) throw new Error('expected table');
    const originalTable = original.blocks[2];
    expect(reTable[1].rows).toEqual(isBlockKind(originalTable, 'Table') ? originalTable[1].rows : []);
  });

  it('round-trips arbitrary block sequences inside list items', () => {
    const original: PapyrDocument = {
      id: 'd',
      blocks: [
        listBlock({
          id: 'l1',
          ordered: false,
          items: [
            {
              blocks: [
                headingBlock({ id: 'h1', level: 2, content: [{ text: 'Nested title' }] }),
                paragraphBlock({ id: 'p1', content: [{ text: 'Body copy' }] }),
                codeBlock({ id: 'c1', language: 'ts', source: 'console.log(1)' }),
                tableBlock({
                  id: 't1',
                  columns: [{ key: 'a', header: 'A' }],
                  rows: [[{ text: '1' }]],
                }),
                mermaidBlock({ id: 'm1', source: 'graph TD; A-->B;' }),
                excalidrawBlock({
                  id: 'e1',
                  elements: [{ text: 'Sketch' }],
                  caption: 'Diagram',
                }),
                listBlock({
                  id: 'l2',
                  ordered: true,
                  items: [
                    {
                      blocks: [
                        paragraphBlock({
                          id: 'p2',
                          content: [{ text: 'Deep child' }],
                        }),
                      ],
                    },
                  ],
                }),
              ],
            },
          ],
        }),
      ],
    };

    const md = serializeDocument(original);
    const reparsed = parseMarkdown(md, { documentId: 'd' });
    const list = reparsed.blocks[0];
    if (!isBlockKind(list, 'List')) throw new Error('expected list');

    const itemBlocks = list[1].items[0]?.blocks ?? [];
    expect(itemBlocks.map((block) => block[0])).toEqual([
      'Heading',
      'Paragraph',
      'Code',
      'Table',
      'Mermaid',
      'Excalidraw',
      'List',
    ]);

    const nestedTable = itemBlocks[3];
    if (!isBlockKind(nestedTable, 'Table')) throw new Error('expected table');
    expect(nestedTable[1].rows).toEqual([[{ text: '1' }]]);

    const nestedList = itemBlocks[6];
    if (!isBlockKind(nestedList, 'List')) throw new Error('expected nested list');
    expect(nestedList[1].items[0]?.blocks[0]).toEqual(
      paragraphBlock({ id: 'b9', content: [{ text: 'Deep child' }] }),
    );
  });

  it('round-trips a list item with a table followed by a paragraph', () => {
    const original: PapyrDocument = {
      id: 'd',
      blocks: [
        listBlock({
          id: 'l1',
          ordered: false,
          items: [
            {
              blocks: [
                tableBlock({
                  id: 't1',
                  columns: [{ key: 'a', header: 'A' }],
                  rows: [[{ text: '1' }]],
                }),
                paragraphBlock({
                  id: 'p1',
                  content: [{ text: 'tail' }],
                }),
              ],
            },
          ],
        }),
      ],
    };

    const md = serializeDocument(original);
    const reparsed = parseMarkdown(md, { documentId: 'd' });
    const list = reparsed.blocks[0];
    if (!isBlockKind(list, 'List')) throw new Error('expected list');

    expect(list[1].items[0]?.blocks).toEqual([
      tableBlock({
        id: 't1',
        columns: [{ key: 'a', header: 'A' }],
        rows: [[{ text: '1' }]],
      }),
      paragraphBlock({
        id: 'b3',
        content: [{ text: 'tail' }],
      }),
    ]);
  });
});

describe('property-based markdown invariants', () => {
  it('round-trips generated documents when block ids are ignored', () => {
    fc.assert(
      fc.property(
        papyrDocumentArbitrary({ maxBlocks: 4, maxDepth: 2, singleInlineRun: true }),
        (original) => {
          const md = serializeDocument(original);
          const reparsed = parseMarkdown(md, { documentId: original.id });
          expect(normalizeBlocks(reparsed.blocks)).toEqual(normalizeBlocks(original.blocks));
        },
      ),
      { numRuns: 40 },
    );
  });

  it('serializes generated GFM-compatible tables without papyr-table fences', () => {
    fc.assert(
      fc.property(gfmCompatibleTableBlockArbitrary, (table) => {
        const md = serializeDocument({ id: 'd', blocks: [table] });
        expect(md).not.toContain('```papyr-table');
        const reparsed = parseMarkdown(md, { documentId: 'd' });
        expect(normalizeBlocks(reparsed.blocks)).toEqual(normalizeBlocks([table]));
      }),
      { numRuns: 40 },
    );
  });

  it('serializes generated non-round-trippable tables as papyr-table fences', () => {
    fc.assert(
      fc.property(fencedTableBlockArbitrary, (table) => {
        const md = serializeDocument({ id: 'd', blocks: [table] });
        expect(md).toContain('```papyr-table');
        const reparsed = parseMarkdown(md, { documentId: 'd' });
        expect(normalizeBlocks(reparsed.blocks)).toEqual(normalizeBlocks([table]));
      }),
      { numRuns: 40 },
    );
  });

  it('assigns deterministic unique keys when parsing generated GFM tables', () => {
    const gfmMarkdownArbitrary = fc.integer({ min: 1, max: 3 }).chain((columnCount) =>
      fc.record({
        headers: fc.array(safeTextArbitrary, { minLength: columnCount, maxLength: columnCount }),
        row: fc.array(safeTextArbitrary, { minLength: columnCount, maxLength: columnCount }),
      }),
    );

    fc.assert(
      fc.property(gfmMarkdownArbitrary, ({ headers, row }) => {
        const input = [
          `| ${headers.join(' | ')} |`,
          `| ${headers.map(() => '---').join(' | ')} |`,
          `| ${row.join(' | ')} |`,
        ].join('\n');

        const first = parseMarkdown(input, { documentId: 'd' });
        const second = parseMarkdown(input, { documentId: 'd' });
        const firstTable = first.blocks[0];
        const secondTable = second.blocks[0];
        if (!isBlockKind(firstTable, 'Table') || !isBlockKind(secondTable, 'Table')) {
          throw new Error('expected table');
        }

        const keys = firstTable[1].columns.map((column) => column.key);
        expect(new Set(keys).size).toBe(keys.length);
        expect(keys).toEqual(secondTable[1].columns.map((column) => column.key));
      }),
      { numRuns: 40 },
    );
  });
});
