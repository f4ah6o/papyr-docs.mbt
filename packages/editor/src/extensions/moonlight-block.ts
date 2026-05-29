import { Node } from '@tiptap/core';
import type { MoonlightBlock } from '@f12o/papyr-core';

export interface MoonlightBlockAttrs {
  id: string | null;
  data: Omit<MoonlightBlock[1], 'id'> | null;
}

export const MoonlightBlockExtension = Node.create({
  name: 'papyrMoonlight',
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
    return [{ tag: 'div[data-papyr-block="moonlight"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      {
        'data-papyr-block': 'moonlight',
        ...HTMLAttributes,
        'data-label': describeMoonlight(node.attrs.data),
      },
    ];
  },
});

function describeMoonlight(value: unknown): string {
  if (!isObject(value)) return 'Moonlight diagram';

  const caption = value.caption;
  if (typeof caption === 'string' && caption.trim().length > 0) return caption;

  return typeof value.svg === 'string' && value.svg.trim().length > 0
    ? 'Moonlight SVG'
    : 'Moonlight diagram';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
