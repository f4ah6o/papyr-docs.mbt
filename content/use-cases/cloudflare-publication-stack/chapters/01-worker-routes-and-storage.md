---
kind: chapter
slug: worker-routes-and-storage
title: Worker ルートと保存先の選び方
summary: 'BackendAdapter 契約と Cloudflare KV / D1 / R2、demo-cloudflare の route をどう組み合わせるか。'
emoji: 🛣️
published: true
topics: [use-case, cloudflare, adapter]
chapterOrder: 1
updatedAt: 2026-05-01T00:00:00.000Z
---

# Worker ルートと保存先の選び方

Cloudflare へ載せるときの判断点は、「どの route を持つか」と「document をどこへ置くか」です。Papyr ではこの 2 つを分けて考えられます。

## 1. storage は `BackendAdapter` に閉じ込める

application code 側は `list` / `get` / `put` / `delete` と optional `search` だけを見ればよく、保存先の差分は adapter 側へ寄せます。

- `createKvAdapter`: まず動かしたい、key-value で十分
- `createD1Adapter`: SQL で一覧や filter を扱いたい
- `createR2Adapter`: JSON object をそのまま置きたい

公開用 object と document JSON を同じ object storage 側へ寄せたいなら R2 が自然です。CRUD 中心の application なら KV や D1 から始めやすいです。

## 2. route は demo-cloudflare を基準に考える

`@f12o/papyr-demo-cloudflare` には次の公開 route があります。

- `/`, `/articles`, `/articles/:slug`
- `/books`, `/books/:slug`, `/books/:slug/:chapterSlug`
- `/studio`

API として `GET /api/publications`, `GET /api/books/:bookId`,
`POST /api/seed/demo-content` も持っています。article、book、chapter
を 1 つの Worker で見せる最小構成の参考になります。

## 3. search の責務をどこへ置くかを決める

公開ドキュメント数が小さい間は `@f12o/papyr-search` の client-side index で十分です。件数が増えてブラウザに index を持たせたくなくなったら、adapter 側の `search` 実装へ寄せる余地があります。

Cloudflare 導入で先に決めるべきなのは、KV / D1 / R2 のどれを使うか
だけではありません。public pages、studio、search を同じ Worker に
寄せるかどうかも決める必要があります。Papyr はこの判断を後ろへ
延ばしやすい構成です。
