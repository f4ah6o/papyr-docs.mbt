---
kind: book
slug: editor
title: "@f12o/papyr-editor"
summary: TipTap ベースのヘッドレスエディタ拡張。リスト項目に任意ブロックを入れられる papyr schema に対応。
emoji: ✍️
published: true
topics: [editor, tiptap]
updatedAt: 2026-04-26T00:00:00.000Z
---

# @f12o/papyr-editor

ブラウザ向けのヘッドレス editor package です。TipTap の extension と converter を提供し、UI binding（React / Vue 等）は含みません。つまり「Papyr 向けの editor schema と変換層だけをほしい」ケースに向いています。

主な役割は次の 2 つです。

`papyrExtensions` は TipTap schema を Papyr の block 構造に合わせます。
`documentToProseMirror` と `proseMirrorToDocument` は `PapyrDocument` と
editor state を相互変換します。

特に Papyr では list item の中に任意 block を入れられるので、通常の TipTap `listItem` をそのまま使わず、Papyr 専用 schema に差し替える必要があります。`@f12o/papyr-editor` はその差分をまとめて吸収する package です。

React で Markdown-visible editor と table / Mermaid / Moonlight の embedded preview + block editor
までまとめて使いたい場合は、`@f12o/papyr-editor` の上に組まれた `@f12o/papyr-editor-ui` を使うと UI を
ゼロから組まずに済みます。

## 最小コード

```ts
import { Editor } from "@tiptap/core";
import { parseMarkdown } from "@f12o/papyr-markdown";
import {
  documentToProseMirror,
  papyrExtensions,
  proseMirrorToDocument,
} from "@f12o/papyr-editor";

const doc = parseMarkdown("# Draft\n\n本文を書きます。", {
  documentId: "draft",
});

const editor = new Editor({
  extensions: papyrExtensions,
  content: documentToProseMirror(doc).toJSON(),
});

const nextDoc = proseMirrorToDocument(editor.state.doc.toJSON(), doc.id);

console.log(nextDoc.blocks.length);
```

UI は含めず、TipTap schema と `PapyrDocument` 変換だけを持つのがこの package の境界です。
