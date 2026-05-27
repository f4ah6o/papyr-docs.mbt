---
kind: book
slug: adapter-cloudflare
title: '@f12o/papyr-adapter-cloudflare'
summary: Cloudflare Workers 向けの BackendAdapter 実装。KV / D1 / R2 の 3 戦略から選択。
emoji: ☁️
published: true
topics: [cloudflare, adapter]
updatedAt: 2026-04-24T00:00:00.000Z
---

# @f12o/papyr-adapter-cloudflare

Cloudflare Workers 上で Papyr を動かしたいときの adapter 集です。保存先の性質に合わせて、同じ `BackendAdapter` interface のまま KV / D1 / R2 を切り替えられます。

## どれを選ぶか

まず動かしてみたい、key-value で十分、運用を軽く始めたいなら
`createKvAdapter` が向いています。SQL で扱いたい、一覧や filter を
後で拡張しそうなら `createD1Adapter`、JSON object をそのまま置きたい、
公開用 asset と同じ object store に寄せたいなら `createR2Adapter` が
自然です。

この docs site 自体は公開データの配信に R2 を使っています。Cloudflare Workers 上で「編集 UI は別、公開物は object store へ置く」という構成にしたい場合、Papyr と相性が良いのは R2 です。

一方で、Studio のような CRUD 中心アプリを作るなら KV や D1 の方が
書き始めやすい場面もあります。backend interface は同じままなので、
最初は KV で始めて、後から D1 や R2 へ寄せる移行もしやすくなっています。

## 最小コード

```ts
import { createKvAdapter, createR2Adapter } from '@f12o/papyr-adapter-cloudflare';
import { parseMarkdown } from '@f12o/papyr-markdown';

export interface Env {
  PAPYR_KV: KVNamespace;
  PAPYR_R2: R2Bucket;
}

export async function handleSave(env: Env) {
  const adapter = createKvAdapter({ kv: env.PAPYR_KV, prefix: 'docs:' });
  const doc = parseMarkdown('# Cloudflare\n\nKV に保存します。', {
    documentId: 'cloudflare',
  });

  await adapter.put(doc);
  return adapter.get('cloudflare');
}

export function createPublishedContentAdapter(env: Env) {
  return createR2Adapter({ bucket: env.PAPYR_R2, prefix: 'published/' });
}
```

KV は小さく始める CRUD、D1 は SQL table として扱いたい文書管理、R2 は公開用 JSON object の配信に向いています。どの adapter も `BackendAdapter` として使えます。
