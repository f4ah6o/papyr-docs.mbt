---
kind: chapter
slug: create-appsheet-adapter
title: createAppSheetAdapter
summary: createAppSheetAdapter の Action endpoint と row mapping。
emoji: 🧾
published: true
topics: [appsheet, auth]
chapterOrder: 1
updatedAt: 2026-04-26T00:00:00.000Z
---

# createAppSheetAdapter

```ts
import { createAppSheetAdapter } from '@f12o/papyr-adapter-appsheet';

const adapter = createAppSheetAdapter({
  appId: process.env.APPSHEET_APP_ID!,
  tableName: 'Docs',
  applicationAccessKey: process.env.APPSHEET_ACCESS_KEY!,
});
```

既定では `papyrId` column に document ID、`papyrDoc` column に serialized `PapyrDocument` JSON を
保存します。列名が違う場合は `keyColumnName` / `docColumnName` で合わせられます。

## options の要点

`applicationAccessKey` はすべての request で
`ApplicationAccessKey` header に入ります。`properties` は AppSheet
Action request の `Properties` にそのまま渡せます。`apiBaseUrl` と
`fetch` は proxy や test で差し替え可能です。

## 振る舞い

`list(query)` は `Find` action を空 query で呼び、必要なら `limit` を
クライアント側で適用します。`get(id)` は key column で `Find` し、
見つからなければ `null` を返します。`put(doc)` は既存 row があれば
`Edit`、なければ `Add` です。`delete(id)` は row が残っているときだけ
`Delete` します。

AppSheet の `Find` は空 query で全 row を返すので、`limit` は API に push down されません。件数が
大きくなったら、adapter を使う側で取得単位や用途を絞る前提で考えると扱いやすくなります。
