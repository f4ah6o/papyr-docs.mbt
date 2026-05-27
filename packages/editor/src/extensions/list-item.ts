import { Node, mergeAttributes } from '@tiptap/core';
import { liftListItem, sinkListItem, splitListItem } from '@tiptap/pm/schema-list';

export interface PapyrListItemOptions {
  HTMLAttributes: Record<string, unknown>;
}

export const PapyrListItemExtension = Node.create<PapyrListItemOptions>({
  name: 'listItem',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  content: 'block+',
  defining: true,

  parseHTML() {
    return [{ tag: 'li' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['li', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => splitListItem(this.type)(this.editor.state, this.editor.view.dispatch),
      Tab: () => sinkListItem(this.type)(this.editor.state, this.editor.view.dispatch),
      'Shift-Tab': () => liftListItem(this.type)(this.editor.state, this.editor.view.dispatch),
    };
  },
});
