---
kind: chapter
slug: create-zoho-creator-adapter
title: createZohoCreatorAdapter
summary: createZohoCreatorAdapter の token 供給、page cursor、form / report の使い分け。
emoji: 🔐
published: true
topics: [zoho, auth]
chapterOrder: 1
updatedAt: 2026-04-26T00:00:00.000Z
---

# createZohoCreatorAdapter

```ts
import { createZohoCreatorAdapter } from '@f12o/papyr-adapter-zoho-creator';

const adapter = createZohoCreatorAdapter({
  accountOwnerName: 'example-owner',
  appLinkName: 'docs-app',
  formLinkName: 'Documents',
  accessToken: async () => process.env.ZOHO_ACCESS_TOKEN!,
});
```

既定では `papyrId` field に document ID、`papyrDoc` field に serialized `PapyrDocument` JSON を
保存します。report 名を form 名と分けたいときは `reportLinkName`、field 名を合わせたいときは
`idFieldLinkName` / `docFieldLinkName` を使います。

## options の要点

`accessToken` は固定文字列でも、request ごとに fresh token を返す関数でも
渡せます。一覧取得や検索を form とは別 report へ向けたいときは
`reportLinkName` を使います。`apiBaseUrl` と `fetch` は proxy や test
で差し替え可能です。

## 振る舞い

`list(query)` は Zoho report endpoint を `page` と `per_page` で読み、
`more_records` が立てば次の page を `nextCursor` に返します。`get(id)` は
`criteria` query で `papyrId` が一致する record を探します。`put(doc)` は
既存 record があれば form endpoint に `PUT`、なければ `POST` です。
`delete(id)` はまず record を引き、その後 report endpoint に `DELETE`
します。

`accessToken` を関数で渡せるので、短寿命 OAuth token を request ごとに更新する構成にも合わせやすくなっています。
