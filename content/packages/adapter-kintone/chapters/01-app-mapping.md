---
kind: chapter
slug: app-mapping
title: createKintoneAdapter
summary: createKintoneAdapter の認証・field mapping・一覧取得の考え方。
emoji: 🏢
published: true
topics: [kintone, auth]
chapterOrder: 1
updatedAt: 2026-04-25T00:00:00.000Z
---

# createKintoneAdapter

```ts
import { createKintoneAdapter } from '@f12o/papyr-adapter-kintone';

const adapter = createKintoneAdapter({
  subdomain: 'example',
  appId: 42,
  auth: { apiToken: process.env.KINTONE_API_TOKEN! },
});
```

`createKintoneAdapter` は、既定では `papyrId` field に document ID、`papyrDoc` field に document JSON 文字列を保存します。必要なら `idFieldCode` / `docFieldCode` で field code を差し替えられます。

## options の要点

`auth` は API token か username/password を選べます。`domain` の既定は
`cybozu.com` で、`.com` tenant では `kintone.com` を指定します。`fetch`
は実行環境に応じて差し替え可能です。

`list` は kintone record を `$id` 昇順で読み、`limit` と `cursor` 相当の offset を使ってページングします。kintone query の複雑さを Papyr 側へ漏らさずに済む一方、filter の意味づけは adapter 実装側で持つ前提です。
