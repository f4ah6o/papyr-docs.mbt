import {
  appendBlock,
  createDefaultExcalidrawBlock,
  createDefaultMermaidBlock,
} from '@f12o/papyr-editor';
import { excalidrawBlock, mermaidBlock, tableBlock } from '@f12o/papyr-core';
import { parseMarkdown, serializeDocument } from '@f12o/papyr-markdown';

const SAMPLE_DOCUMENT_ID = 'papyr-editor-workspace-sample';

const SAMPLE_BODY = [
  '# Papyr integrated editor',
  '',
  'Markdown 記号を残したまま style と preview を 1 つの workflow に統合した editor です。',
  '',
  '## Try it',
  '',
  '- Style palette は hidden rich text ではなく Markdown を直接書き換えます',
  '- table / Mermaid / Excalidraw の preview card を double click / double tap すると focused editor が開きます',
  '- Add Mermaid / Add Excalidraw で diagram block を追加できます',
  '',
  '```ts',
  "console.log('papyr integrated editor');",
  '```',
].join('\n');

export function createSampleDocumentSource(): string {
  const base = parseMarkdown(SAMPLE_BODY, { documentId: SAMPLE_DOCUMENT_ID });

  const defaultMermaid = createDefaultMermaidBlock('mermaid-sample');
  const withMermaid = appendBlock(base, mermaidBlock({
    ...defaultMermaid[1],
    caption: 'Publishing flow',
    source: [
      'graph TD',
      '  Draft --> Review',
      '  Review --> Published',
      '  Review --> Rework',
    ].join('\n'),
  }));

  const withTable = appendBlock(withMermaid, tableBlock({
    id: 'table-sample',
    caption: 'Publishing checklist',
    columns: [
      { key: 'step', header: 'Step' },
      { key: 'owner', header: 'Owner' },
      { key: 'status', header: 'Status' },
    ],
    rows: [
      [{ text: 'Draft' }, { text: 'Writer' }, { text: 'Done' }],
      [{ text: 'Review' }, { text: 'Editor' }, { text: 'In progress' }],
      [{ text: 'Publish' }, { text: 'Ops' }, { text: 'Queued' }],
    ],
  }));

  const defaultExcalidraw = createDefaultExcalidrawBlock('excalidraw-sample');
  const withExcalidraw = appendBlock(withTable, excalidrawBlock({
    ...defaultExcalidraw[1],
    caption: 'Review loop',
    elements: [
      {
        type: 'rectangle',
        x: 20,
        y: 24,
        width: 180,
        height: 72,
        strokeColor: '#1f6f5f',
        backgroundColor: '#eef9f6',
        strokeWidth: 2,
      },
      {
        type: 'text',
        x: 54,
        y: 44,
        text: 'Write draft',
        strokeColor: '#1f2629',
        fontSize: 22,
      },
      {
        type: 'arrow',
        x: 212,
        y: 60,
        width: 144,
        height: 0,
        strokeColor: '#8b5e34',
        backgroundColor: 'transparent',
        strokeWidth: 2,
        points: [
          [0, 0],
          [144, 0],
        ],
      },
      {
        type: 'rectangle',
        x: 370,
        y: 24,
        width: 180,
        height: 72,
        strokeColor: '#8b5e34',
        backgroundColor: '#fff5eb',
        strokeWidth: 2,
      },
      {
        type: 'text',
        x: 412,
        y: 44,
        text: 'Review',
        strokeColor: '#1f2629',
        fontSize: 22,
      },
    ],
    app_state: {
      viewBackgroundColor: '#ffffff',
    },
  }));

  return serializeDocument(withExcalidraw);
}
