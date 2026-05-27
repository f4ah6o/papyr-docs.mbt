---
kind: book
slug: backend
title: '@f12o/papyr-backend'
summary: バックエンドアダプタのインターフェース。list / get / put / delete と optional search を揃える土台。
emoji: 🗄️
published: true
topics: [backend, adapter]
updatedAt: 2026-04-25T00:00:00.000Z
---

# @f12o/papyr-backend

`@f12o/papyr-backend` は「PapyrDocument をどこに保存するか」を application code から切り離すための interface です。UI や parser は storage の詳細を知らずに済み、保存先だけ後から差し替えられます。

現時点では、ローカル JSON ファイル向けの
`@f12o/papyr-adapter-fs`、kintone アプリ向けの
`@f12o/papyr-adapter-kintone`、Cloudflare KV / D1 / R2 向けの
`@f12o/papyr-adapter-cloudflare` を用意しています。

この package 自体は interface だけを持ちます。基本の CRUD に加えて
optional な `search?` を置けるので、クライアントサイド検索で足りる
構成と、backend に検索を寄せる構成を同じ契約で扱えます。導入時は
自分の deployment 環境に近い adapter を選ぶか、必要なら
`BackendAdapter` を実装した独自 package を追加してください。

Papyr を小さく導入するときは storage を後回しにしても構いません。まず `PapyrDocument` を作って表示し、永続化が必要になった段階で `@f12o/papyr-backend` を入れると設計しやすくなります。

## 最小コード

```ts
import type { BackendAdapter } from '@f12o/papyr-backend';
import { parseMarkdown } from '@f12o/papyr-markdown';

export async function saveFirstDocument(adapter: BackendAdapter) {
  const doc = parseMarkdown('# Saved\n\nadapter 越しに保存します。', {
    documentId: 'saved',
  });

  await adapter.put(doc);

  const loaded = await adapter.get('saved');
  const page = await adapter.list({ limit: 10 });

  return { loaded, count: page.items.length };
}
```

Application code は `BackendAdapter` だけに依存します。保存先を Cloudflare KV から D1、R2、ローカル JSON へ変えても、`put` / `get` / `list` / `delete` の呼び出しは同じです。
