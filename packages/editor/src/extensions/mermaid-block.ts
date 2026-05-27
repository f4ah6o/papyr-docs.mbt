import { Node } from '@tiptap/core';

export const MermaidBlockExtension = Node.create({
  name: 'papyrMermaid',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  content: '',

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
      source: { default: '' },
      caption: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-papyr-block="mermaid"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'div',
      {
        'data-papyr-block': 'mermaid',
        ...HTMLAttributes,
        'data-label': describeMermaid(node.attrs.source, node.attrs.caption),
      },
    ];
  },
});

function describeMermaid(source: unknown, caption: unknown): string {
  if (typeof caption === 'string' && caption.trim().length > 0) return caption;
  if (typeof source === 'string') {
    const firstLine = source
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0);
    if (firstLine) return firstLine;
  }
  return 'Mermaid diagram';
}
