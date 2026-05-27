---
kind: book
slug: preview
title: '@f12o/papyr-preview'
summary: PapyrDocument をブラウザや WebView でそのまま描画する preview renderer。
emoji: 👀
published: true
topics: [preview, renderer]
updatedAt: 2026-04-25T00:00:00.000Z
---

# @f12o/papyr-preview

`@f12o/papyr-preview` は `PapyrDocument` を read-only に表示するための renderer です。HTML 文字列を組み立てる代わりに、browser / WebView 上の DOM container へ直接描画します。

見出し・段落・リスト・コードブロックだけでなく、table / Mermaid / Excalidraw も扱えるので、Papyr の標準 block をまず表示したいときの最短ルートになります。

## 最小コード

```ts
import { parseMarkdown } from '@f12o/papyr-markdown';
import { renderDocumentPreview, mountPapyrDocumentViewer } from '@f12o/papyr-preview';

const doc = parseMarkdown('# Preview\n\nブラウザに描画します。', {
  documentId: 'preview-demo',
});

await renderDocumentPreview(document.querySelector('#preview')!, doc);

await mountPapyrDocumentViewer(document.querySelector('#reader')!, {
  document: doc,
  markdownSource: '# Preview\n\nブラウザに描画します。',
});
```

`renderDocumentPreview` は小さな embedded preview 向けで、`mountPapyrDocumentViewer` は目次や source copy を含む reader surface 向けです。どちらも `PapyrDocument` を受け取り、parser や storage の詳細は知りません。
