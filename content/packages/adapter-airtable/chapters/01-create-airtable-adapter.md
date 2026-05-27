---
kind: chapter
slug: create-airtable-adapter
title: createAirtableAdapter
summary: createAirtableAdapter の field mapping と list / upsert の振る舞い。
emoji: 🗂️
published: true
topics: [airtable, auth]
chapterOrder: 1
updatedAt: 2026-04-26T00:00:00.000Z
---

# createAirtableAdapter

```ts
import { createAirtableAdapter } from '@f12o/papyr-adapter-airtable';

const adapter = createAirtableAdapter({
  baseId: process.env.AIRTABLE_BASE_ID!,
  table: 'Docs',
  token: process.env.AIRTABLE_TOKEN!,
});
```

既定では `papyrId` field に document ID、`papyrDoc` field に serialized `PapyrDocument` JSON を
保存します。field 名が既存 base と合わない場合は `idFieldName` / `docFieldName` で差し替えできます。

## options の要点

一覧と検索対象を特定 view に寄せたいときは `view` を使います。
`apiBaseUrl` は Airtable 互換 endpoint や proxy を挟む場合の差し替え用で、
`fetch` は実行環境や test に合わせて差し替えられます。

## 振る舞い

`list(query)` は Airtable の `pageSize` と `offset` を使って読み、
`nextCursor` に `offset` を返します。`get(id)` は `filterByFormula` で
`papyrId` が一致する record を 1 件探します。`put(doc)` は既存 record
があれば `PATCH`、なければ `POST` です。`delete(id)` は対応 record が
見つかったときだけ `DELETE` します。

document ID に含まれる quote や backslash は formula 用に escape されるので、Papyr 側の ID を
そのまま Airtable query に流せます。
