---
kind: chapter
slug: integration
title: TipTap との組み合わせ
summary: StarterKit の listItem を無効化し、papyrExtensions を登録する手順。
emoji: 🔧
published: true
topics: [integration]
chapterOrder: 1
updatedAt: 2026-04-24T00:00:00.000Z
---

# TipTap との組み合わせ

`@f12o/papyr-editor` を TipTap `StarterKit` と組み合わせて使う場合は、既定の `listItem` extension を無効にし、代わりに `papyrExtensions` を登録してください。Papyr 側の `listItem` schema が、リスト項目内の任意 block 列を受け取れるようになります。

```ts
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { documentToProseMirror, papyrExtensions, proseMirrorToDocument } from '@f12o/papyr-editor';

const initial = documentToProseMirror(doc);

const editor = new Editor({
  extensions: [StarterKit.configure({ listItem: false }), ...papyrExtensions],
  content: initial.content,
});

const saved = proseMirrorToDocument(editor.getJSON(), doc.id);
```

この構成にしておくと、保存時は常に `PapyrDocument` へ戻せます。editor 内部 state をそのまま storage に保存しないので、preview・search・backend と同じ document model を保ちやすくなります。

UI binding は利用側で組みます。React / Vue / Svelte など、プロジェクトに合うものを選んでください。`@f12o/papyr-editor` はあくまで headless layer で、見た目や toolbar は application 側の責務です。
