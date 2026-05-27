import { Node } from '@tiptap/core';
import type { TableBlock } from '@f12o/papyr-core';

export interface TableBlockAttrs {
  id: string | null;
  data: Omit<TableBlock, 'type' | 'id'> | null;
}

export const TableBlockExtension = Node.create({
  name: 'papyrTable',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-papyr-block-id'),
        renderHTML: (attrs: Record<string, unknown>) =>
          typeof attrs.id === 'string' && attrs.id.length > 0
            ? { 'data-papyr-block-id': attrs.id }
            : {},
      },
      data: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const raw = el.getAttribute('data-papyr');
          return raw ? JSON.parse(raw) : null;
        },
        renderHTML: (attrs: Record<string, unknown>) => ({
          'data-papyr': JSON.stringify(attrs.data),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-papyr-block="table"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      {
        'data-papyr-block': 'table',
        ...HTMLAttributes,
        'data-label': describeTable(node.attrs.data),
      },
    ];
  },
});

function describeTable(value: unknown): string {
  if (!isObject(value)) return 'Table block';
  const columns = value.columns;
  if (!Array.isArray(columns) || columns.length === 0) return 'Table block';
  return `Table (${columns.length} columns)`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
