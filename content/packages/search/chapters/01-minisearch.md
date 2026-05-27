---
kind: chapter
slug: minisearch
title: MiniSearch アダプタ
summary: createMiniSearchAdapter と toIndexable の使い方。
emoji: 🧭
published: true
topics: [minisearch]
chapterOrder: 1
updatedAt: 2026-04-24T00:00:00.000Z
---

# MiniSearch アダプタ

```ts
import { createMiniSearchAdapter } from '@f12o/papyr-search';

const adapter = createMiniSearchAdapter({
  boost: { title: 3, headings: 2 },
  maxBlockMatches: 2,
});

for (const doc of documents) {
  adapter.add(doc);
}

const hits = adapter.search('valibot');
```

`SearchResult` は `id` / `score` / `blockMatches?` を持ちます。`blockMatches` には「どの block がヒットしたか」と「その周辺 snippet」が入るので、検索結果一覧を作るときに title だけで終わらず、**本文のどこが当たったか** まで出せます。

MiniSearch adapter の既定設定では、title と heading を body より強く評価します。docs site や knowledge base ではこの既定値が扱いやすいですが、必要なら `boost` や `fields` を上書きできます。

検索対象が増える場合は、ビルド時に `toIndexable(doc)` を使って indexable な shape を前計算し、配列ごと JSON で配布する戦略が有効です。このサイトも同じ方針で `search-index.json` を生成しています。
