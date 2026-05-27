import { Node } from '@tiptap/core';
import type { ExcalidrawBlock } from '@f12o/papyr-core';

export interface ExcalidrawBlockAttrs {
  id: string | null;
  data: Omit<ExcalidrawBlock, 'type' | 'id'> | null;
}

export const ExcalidrawBlockExtension = Node.create({
  name: 'papyrExcalidraw',
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
    return [{ tag: 'div[data-papyr-block="excalidraw"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      {
        'data-papyr-block': 'excalidraw',
        ...HTMLAttributes,
        'data-label': describeExcalidraw(node.attrs.data),
      },
    ];
  },
});

function describeExcalidraw(value: unknown): string {
  if (!isObject(value)) return 'Excalidraw scene';

  const caption = value.caption;
  if (typeof caption === 'string' && caption.trim().length > 0) return caption;

  const elements = value.elements;
  if (Array.isArray(elements) && elements.length > 0) {
    return `Excalidraw (${elements.length} elements)`;
  }

  return 'Excalidraw scene';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
