---
kind: chapter
slug: parse-serialize
title: parseMarkdown / serializeDocument
summary: Markdown 文字列と PapyrDocument の相互変換 API。
emoji: 🔁
published: true
topics: [markdown, api]
chapterOrder: 1
updatedAt: 2026-04-24T00:00:00.000Z
---

# parseMarkdown / serializeDocument

`parseMarkdown` と `serializeDocument` は対になる API ですが、**完全に同じ情報を往復するわけではありません**。Papyr の導入時に一度ここを理解しておくと、後で `meta` や frontmatter の扱いで迷いません。

```ts
import { parseMarkdown, serializeDocument } from '@f12o/papyr-markdown';

const doc = parseMarkdown('# Hello', {
  documentId: 'hello',
  generateId: (() => {
    let n = 0;
    return () => `block-${++n}`;
  })(),
});

const markdown = serializeDocument(doc);
```

## `parseMarkdown`

- `documentId` を指定しない場合は `untitled`
- block の `id` は既定で `b1`, `b2`, ... の連番
- Markdown の本文だけを `PapyrDocument` にする。frontmatter は別レイヤーで扱う

## `serializeDocument`

- `blocks` を Markdown に戻す
- `id` / `title` / `meta` は Markdown 本文に自動では出さない
- `table` / `excalidraw` / `mermaid` は特殊フェンスに変換する

つまり、**ドキュメント本文の往復**は `@f12o/papyr-markdown` が担当し、**メタデータの保持**はアプリ側で設計する、という分担です。
