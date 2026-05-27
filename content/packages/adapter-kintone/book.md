---
kind: book
slug: adapter-kintone
title: '@f12o/papyr-adapter-kintone'
summary: kintone アプリへ PapyrDocument を保存する BackendAdapter。
emoji: 🧩
published: true
topics: [backend, kintone]
updatedAt: 2026-04-25T00:00:00.000Z
---

# @f12o/papyr-adapter-kintone

`@f12o/papyr-adapter-kintone` は、kintone の record API を通して `PapyrDocument` を保存・取得する adapter です。Papyr 側から見ると `BackendAdapter` ですが、内部では document ID と document JSON を kintone record の field に対応づけます。

kintone を既存の業務基盤として使っている環境で、PapyrDocument を外部 DB なしで載せたいときの選択肢です。

## 最小コード

```ts
import { createKintoneAdapter } from '@f12o/papyr-adapter-kintone';
import { parseMarkdown } from '@f12o/papyr-markdown';

const adapter = createKintoneAdapter({
  appId: 42,
  domain: 'example.cybozu.com',
  apiToken: process.env.KINTONE_API_TOKEN!,
  idField: 'papyrId',
  documentField: 'papyrDoc',
});

await adapter.put(parseMarkdown('# kintone note', {
  documentId: 'kintone-note',
}));
```

Papyr 側では `BackendAdapter` として扱い、kintone 固有の field mapping は adapter 作成時に閉じ込めます。
