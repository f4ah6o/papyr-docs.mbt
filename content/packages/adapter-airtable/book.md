---
kind: book
slug: adapter-airtable
title: '@f12o/papyr-adapter-airtable'
summary: Airtable base / table へ PapyrDocument を保存する BackendAdapter。
emoji: 📋
published: true
topics: [backend, airtable]
updatedAt: 2026-04-26T00:00:00.000Z
---

# @f12o/papyr-adapter-airtable

`@f12o/papyr-adapter-airtable` は、Airtable の table を `BackendAdapter` として扱うための package
です。Papyr 側からは `get` / `put` / `list` / `delete` だけを見せつつ、内部では document ID と
document JSON を Airtable record の field に対応づけます。

Airtable を小さな公開 CMS や業務データ置き場として使っている環境で、PapyrDocument を追加 DB
なしで持ち込みたいときの選択肢です。

## 最小コード

```ts
import { createAirtableAdapter } from '@f12o/papyr-adapter-airtable';
import { parseMarkdown } from '@f12o/papyr-markdown';

const adapter = createAirtableAdapter({
  apiKey: process.env.AIRTABLE_API_KEY!,
  baseId: 'app...',
  tableName: 'Documents',
  idField: 'papyrId',
  documentField: 'papyrDoc',
});

await adapter.put(parseMarkdown('# Airtable note', {
  documentId: 'airtable-note',
}));
```

Table 側には Papyr の ID と JSON document を置き、application code からは `BackendAdapter` の CRUD だけを呼びます。
