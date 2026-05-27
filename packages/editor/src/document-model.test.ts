import { describe, expect, it } from 'vitest';
import type { PapyrDocument } from '@f12o/papyr-core';
import { listBlock, mermaidBlock, paragraphBlock, tableBlock, excalidrawBlock } from '@f12o/papyr-core';
import {
  appendBlock,
  createDefaultExcalidrawBlock,
  createDefaultMermaidBlock,
  findEmbeddedBlock,
  findDiagramBlock,
  listEmbeddedBlocks,
  listDiagramBlocks,
  updateEmbeddedBlock,
  updateDiagramBlock,
} from './document-model.js';

describe('document-model helpers', () => {
  const nestedDoc: PapyrDocument = {
    id: 'doc-1',
    blocks: [
      listBlock({
        id: 'list-1',
        ordered: false,
        items: [
          {
            blocks: [
              paragraphBlock({
                id: 'p-1',
                content: [{ text: 'Nested' }],
              }),
              tableBlock({
                id: 't-1',
                columns: [{ key: 'status', header: 'Status' }],
                rows: [[{ text: 'Draft' }], [{ text: 'Published' }]],
                caption: 'Release status',
              }),
              mermaidBlock({
                id: 'm-1',
                source: 'graph TD;\n  A-->B;',
                caption: 'Flow',
              }),
            ],
          },
        ],
      }),
      excalidrawBlock({
        id: 'e-1',
        elements: [{ type: 'rectangle', x: 0, y: 0 }],
      }),
    ],
  };

  it('lists nested embedded blocks including tables', () => {
    expect(listEmbeddedBlocks(nestedDoc)).toEqual([
      { id: 't-1', type: 'table', label: 'Release status', caption: 'Release status' },
      { id: 'm-1', type: 'mermaid', label: 'Flow', caption: 'Flow' },
      { id: 'e-1', type: 'excalidraw', label: 'Excalidraw (1 elements)' },
    ]);
  });

  it('lists nested diagram blocks', () => {
    expect(listDiagramBlocks(nestedDoc)).toEqual([
      { id: 'm-1', type: 'mermaid', label: 'Flow', caption: 'Flow' },
      { id: 'e-1', type: 'excalidraw', label: 'Excalidraw (1 elements)' },
    ]);
  });

  it('updates nested embedded table blocks by id', () => {
    const next = updateEmbeddedBlock(nestedDoc, 't-1', (block) =>
      block[0] === 'Table'
        ? tableBlock({
            ...block[1],
            rows: [...block[1].rows, [{ text: 'Archived' }]],
          })
        : block,
    );

    expect(findEmbeddedBlock(next, 't-1')).toMatchObject(['Table', {
      rows: [[{ text: 'Draft' }], [{ text: 'Published' }], [{ text: 'Archived' }]],
    }]);
  });

  it('updates nested diagram blocks by id', () => {
    const next = updateDiagramBlock(nestedDoc, 'm-1', (block) =>
      block[0] === 'Mermaid'
        ? mermaidBlock({ ...block[1], source: 'graph TD;\n  Start-->Done;' })
        : block,
    );

    expect(findDiagramBlock(next, 'm-1')).toMatchObject(['Mermaid', {
      source: 'graph TD;\n  Start-->Done;',
    }]);
  });

  it('keeps diagram-only helpers scoped away from table ids', () => {
    expect(findDiagramBlock(nestedDoc, 't-1')).toBeUndefined();
    expect(updateDiagramBlock(nestedDoc, 't-1', (block) => block)).toBe(nestedDoc);
  });

  it('appends default diagram blocks', () => {
    const withMermaid = appendBlock(nestedDoc, createDefaultMermaidBlock('m-new'));
    const withExcalidraw = appendBlock(withMermaid, createDefaultExcalidrawBlock('e-new'));

    expect(findDiagramBlock(withExcalidraw, 'm-new')?.[0]).toBe('Mermaid');
    expect(findDiagramBlock(withExcalidraw, 'e-new')?.[0]).toBe('Excalidraw');
  });
});
