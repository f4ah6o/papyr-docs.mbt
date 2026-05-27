import { getSchema } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextSelection, EditorState } from '@tiptap/pm/state';
import { liftListItem, sinkListItem, splitListItem } from '@tiptap/pm/schema-list';
import { describe, expect, it } from 'vitest';
import { papyrExtensions } from './schema.js';

describe('papyrExtensions', () => {
  it('exposes the Papyr list item and custom block nodes', () => {
    const names = papyrExtensions.map((ext) => ext.name);
    expect(names).toEqual(['listItem', 'papyrTable', 'papyrExcalidraw', 'papyrMermaid']);
  });

  it('accepts non-paragraph-first blocks inside list items', () => {
    const schema = getSchema([StarterKit.configure({ listItem: false }), ...papyrExtensions]);
    const doc = schema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'heading',
                  attrs: { level: 2 },
                  content: [{ type: 'text', text: 'Nested heading' }],
                },
                {
                  type: 'codeBlock',
                  attrs: { language: 'ts' },
                  content: [{ type: 'text', text: 'console.log(1)' }],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(doc.child(0)?.child(0)?.child(0)?.type.name).toBe('heading');
  });

  it('keeps split, sink, and lift list commands usable', () => {
    const schema = getSchema([StarterKit.configure({ listItem: false }), ...papyrExtensions]);
    const itemType = schema.nodes.listItem;
    if (!itemType) throw new Error('expected listItem');

    const splitDoc = schema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }],
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'two' }] }],
            },
          ],
        },
      ],
    });
    let splitState = EditorState.create({
      schema,
      doc: splitDoc,
      selection: TextSelection.create(splitDoc, 5),
    });
    let splitNext = splitState;
    const splitRan = splitListItem(itemType)(splitState, (tr) => {
      splitNext = splitState.apply(tr);
    });
    expect(splitRan).toBe(true);
    expect(splitNext.doc.child(0)?.childCount).toBe(3);

    const sinkDoc = schema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }],
            },
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'two' }] }],
            },
          ],
        },
      ],
    });
    const sinkState = EditorState.create({
      schema,
      doc: sinkDoc,
      selection: TextSelection.create(sinkDoc, 11),
    });
    let sinkNext = sinkState;
    const sinkRan = sinkListItem(itemType)(sinkState, (tr) => {
      sinkNext = sinkState.apply(tr);
    });
    expect(sinkRan).toBe(true);
    expect(sinkNext.doc.toJSON()).toMatchObject({
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph' },
                {
                  type: 'bulletList',
                  content: [{ type: 'listItem' }],
                },
              ],
            },
          ],
        },
      ],
    });

    const liftDoc = schema.nodeFromJSON({
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'one' }] },
                {
                  type: 'bulletList',
                  content: [
                    {
                      type: 'listItem',
                      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'two' }] }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    const liftState = EditorState.create({
      schema,
      doc: liftDoc,
      selection: TextSelection.create(liftDoc, 12),
    });
    let liftNext = liftState;
    const liftRan = liftListItem(itemType)(liftState, (tr) => {
      liftNext = liftState.apply(tr);
    });
    expect(liftRan).toBe(true);
    expect(liftNext.doc.toJSON()).toMatchObject({
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [{ type: 'listItem' }, { type: 'listItem' }],
        },
      ],
    });
  });
});
