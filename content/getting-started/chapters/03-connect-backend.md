---
kind: chapter
slug: connect-backend
title: backend につなぐ
summary: Worker / API endpoint 経由で PapyrDocument を保存・取得する導線を決める。
emoji: 🌐
published: true
topics: [backend, api]
chapterOrder: 3
updatedAt: 2026-05-01T00:00:00.000Z
---

# backend につなぐ

`PapyrDocument` を作れるようになったら、次は browser や editor から
保存先へ渡す経路を決めます。Papyr では UI と storage を直接結びつけず、
API endpoint や Worker から `BackendAdapter` を呼ぶ形にしておくと
構成を差し替えやすくなります。

## 最小のつなぎ方

1. browser 側では Markdown source か `PapyrDocument` を保持する
2. 保存時に API endpoint / Worker へ送る
3. endpoint 側で `parseMarkdown` して `adapter.put(doc)` を呼ぶ
4. 読み出し時は `adapter.get(id)` / `adapter.list()` を返す

```ts
import type { BackendAdapter } from '@f12o/papyr-backend';
import { parseMarkdown } from '@f12o/papyr-markdown';

export async function putDocument(request: Request, adapter: BackendAdapter): Promise<Response> {
  const payload = (await request.json()) as { id: string; markdown: string };
  const doc = parseMarkdown(payload.markdown, {
    documentId: payload.id,
  });

  await adapter.put(doc);

  return Response.json({ id: doc.id });
}
```

editor 側ですでに `PapyrDocument` を持っているなら、endpoint では parse し直さず `adapter.put(doc)` を呼ぶだけで構いません。大事なのは、保存先ごとの差分を endpoint の奥に閉じ込めることです。

## どの adapter から始めるか

ローカル PoC なら [@f12o/papyr-adapter-fs](/books/adapter-fs)、
Cloudflare Workers なら
[@f12o/papyr-adapter-cloudflare](/books/adapter-cloudflare) が始めやすい
選択です。interface の基準点は [@f12o/papyr-backend](/books/backend) に
あります。

`BackendAdapter` は `list` / `get` / `put` / `delete` を揃えるだけなので、最初は file 保存で始めて、後から Cloudflare や業務 SaaS 向け adapter に寄せても application code を大きく崩さずに済みます。

## Worker ベースの全体像を見たいとき

公開 API まで含めた構成を見たいなら、[@f12o/papyr-demo-cloudflare](/books/demo-cloudflare) の [publication API](/books/demo-cloudflare/publication-api) が近い例です。docs site のように「公開ページは read-only、編集 UI は別 route」という分け方もここから辿れます。
