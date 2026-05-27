---
kind: book
slug: search
title: '@f12o/papyr-search'
summary: クライアントサイド全文検索。既定は MiniSearch、SearchAdapter で差し替え可能。
emoji: 🔎
published: true
topics: [search]
updatedAt: 2026-04-24T00:00:00.000Z
---

# @f12o/papyr-search

`@f12o/papyr-search` は `PapyrDocument` を対象にした全文検索 package です。既定実装は MiniSearch で、ブラウザ側に index を持つ前提の構成をすぐに作れます。

Papyr の search layer は、`SearchAdapter` という小さな interface に寄せています。

`add(doc)` は document を index に追加し、`remove(id)` は document を
除外します。`search(query)` は hit 一覧を返し、`clear()` は index を
初期化します。

この形にしてあるので、まずは MiniSearch を使い、後で server-side search や別ライブラリに置き換えることもできます。

小〜中規模の docs site なら build 時に JSON index を作ってブラウザ配信する構成が簡単です。document 数が増えてきたら、backend 側の `search` 実装に責務を移す判断もできます。

## 最小コード

```ts
import { createMiniSearchAdapter } from '@f12o/papyr-search';
import { parseMarkdown } from '@f12o/papyr-markdown';

const search = createMiniSearchAdapter();

search.add(parseMarkdown('# Install\n\npnpm add @f12o/papyr-core', {
  documentId: 'install',
}));
search.add(parseMarkdown('# Preview\n\nrenderDocumentPreview で表示します。', {
  documentId: 'preview',
}));

const hits = search.search('preview');
console.log(hits.map((hit) => hit.id)); // ['preview']
```

検索対象の text は `PapyrDocument` の heading、paragraph、code、table などから抽出されます。結果には document ID と score、見つかった block の snippet が入ります。
