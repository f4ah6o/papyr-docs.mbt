import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { papyrDocumentArbitrary } from '@f12o/papyr-test-support';
import {
  PapyrDocumentValidationError,
  codeBlock,
  formatDocumentValidationError,
  headingBlock,
  isBlockKind,
  listBlock,
  mermaidBlock,
  parseDocument,
  paragraphBlock,
  tableBlock,
  validateDocument,
} from './document.js';

describe('parseDocument', () => {
  it('accepts a minimal document', () => {
    const doc = parseDocument({ id: 'd1', blocks: [] });
    expect(doc.id).toBe('d1');
    expect(doc.blocks).toEqual([]);
  });

  it('accepts a document with mixed blocks', () => {
    const doc = parseDocument({
      id: 'd2',
      blocks: [
        headingBlock({ id: 'h1', level: 1, content: [{ text: 'Hello' }] }),
        tableBlock({
          id: 't1',
          columns: [{ key: 'a', header: 'A' }],
          rows: [[{ text: '1' }]],
        }),
        mermaidBlock({ id: 'm1', source: 'graph TD; A-->B;' }),
      ],
    });
    expect(doc.blocks).toHaveLength(3);
  });

  it('accepts recursive list items with arbitrary blocks', () => {
    const doc = parseDocument({
      id: 'd3',
      blocks: [
        listBlock({
          id: 'l1',
          ordered: false,
          items: [
            {
              blocks: [
                paragraphBlock({ id: 'p1', content: [{ text: 'Intro' }] }),
                codeBlock({ id: 'c1', language: 'ts', source: 'console.log(1)' }),
                listBlock({
                  id: 'l2',
                  ordered: true,
                  items: [
                    {
                      blocks: [
                        headingBlock({ id: 'h2', level: 2, content: [{ text: 'Nested' }] }),
                      ],
                    },
                  ],
                }),
              ],
            },
          ],
        }),
      ],
    });
    const list = doc.blocks[0];
    expect(list?.[0]).toBe('List');
    if (!isBlockKind(list, 'List')) throw new Error('expected list');
    expect(list[1].items[0]?.blocks.map((block) => block[0])).toEqual([
      'Paragraph',
      'Code',
      'List',
    ]);
  });

  it('rejects legacy list item shapes', () => {
    expect(() =>
      parseDocument({
        id: 'd4',
        blocks: [
          {
            type: 'list',
            id: 'l1',
            ordered: false,
            items: [{ content: [{ text: 'old' }] }],
          },
        ],
      }),
    ).toThrow();
  });

  it('rejects unknown block types', () => {
    expect(() => parseDocument({ id: 'd5', blocks: [['Bogus', { id: 'b' }]] })).toThrow();
  });

  it('accepts generated valid documents', () => {
    fc.assert(
      fc.property(papyrDocumentArbitrary(), (doc) => {
        expect(parseDocument(doc)).toEqual(doc);
      }),
      { numRuns: 50 },
    );
  });

  it('rejects generated heading levels outside the 1..6 range', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -20, max: 20 }).filter((level) => level < 1 || level > 6),
        (level) => {
          expect(() =>
            parseDocument({
              id: 'invalid-heading',
              blocks: [headingBlock({ id: 'h1', level, content: [{ text: 'bad' }] })],
            }),
          ).toThrow();
        },
      ),
      { numRuns: 25 },
    );
  });

  it('preserves the Papyr validation error throw contract and can still be formatted', () => {
    expect.assertions(4);

    try {
      parseDocument({
        id: 'd6',
        blocks: [headingBlock({ id: 'h1', level: 9, content: [{ text: 'Hello' }] })],
      });
    } catch (error) {
      expect(error).toBeInstanceOf(PapyrDocumentValidationError);
      expect(error).toBeInstanceOf(Error);
      if (!(error instanceof PapyrDocumentValidationError)) {
        throw new Error('expected PapyrDocumentValidationError');
      }

      const message = formatDocumentValidationError(error);
      expect(message).toContain('PapyrDocument validation failed.');
      expect(message).toContain('blocks.0.level');
    }
  });
});

describe('validateDocument', () => {
  it('returns the parsed document on success', () => {
    const result = validateDocument({ id: 'd7', blocks: [] });

    expect(result).toEqual({
      success: true,
      document: {
        id: 'd7',
        blocks: [],
      },
    });
  });

  it('returns a focused issue for nested list item validation failures', () => {
    const result = validateDocument({
      id: 'd8',
      blocks: [
        ['List', { id: 'l1', ordered: false, items: [{ content: [{ text: 'legacy item' }] }] }],
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('expected validation failure');

    expect(result.error).toBeInstanceOf(PapyrDocumentValidationError);
    expect(result.issues).toEqual([
      expect.objectContaining({
        path: ['blocks', 0, 'items', 0, 'blocks'],
        pathString: 'blocks.0.items.0.blocks',
        expected: 'non-empty Array',
        received: 'undefined',
      }),
    ]);
  });

  it('collapses unknown block type failures to a single discriminator issue', () => {
    const result = validateDocument({
      id: 'd9',
      blocks: [['Bogus', { id: 'b1' }]],
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('expected validation failure');

    expect(result.error).toBeInstanceOf(PapyrDocumentValidationError);
    expect(result.issues).toEqual([
      expect.objectContaining({
        path: ['blocks', 0, 0],
        pathString: 'blocks.0.0',
        received: '"Bogus"',
      }),
    ]);
    expect(result.issues[0]?.expected).toContain('"Paragraph"');
    expect(result.issues[0]?.expected).toContain('"Mermaid"');
  });
});
