---
kind: book
slug: adapter-zoho-creator
title: '@f12o/papyr-adapter-zoho-creator'
summary: Zoho Creator の form / report へ PapyrDocument を保存する BackendAdapter。
emoji: 🏬
published: true
topics: [backend, zoho]
updatedAt: 2026-04-26T00:00:00.000Z
---

# @f12o/papyr-adapter-zoho-creator

`@f12o/papyr-adapter-zoho-creator` は、Zoho Creator v2 API を使って `PapyrDocument` を form / report に
保存する adapter です。Papyr 側は通常の CRUD interface のまま、Zoho 側では record ID と
`papyrId` / `papyrDoc` field mapping を吸収します。

Zoho Creator を既存の業務アプリ基盤として使っていて、PapyrDocument を同じアプリ内で管理したい
ケースに向いています。

## 最小コード

```ts
import { createZohoCreatorAdapter } from '@f12o/papyr-adapter-zoho-creator';
import { parseMarkdown } from '@f12o/papyr-markdown';

const adapter = createZohoCreatorAdapter({
  accountOwnerName: 'team',
  appLinkName: 'docs',
  reportLinkName: 'All_Documents',
  formLinkName: 'Document',
  accessToken: process.env.ZOHO_ACCESS_TOKEN!,
  idField: 'papyrId',
  documentField: 'papyrDoc',
});

await adapter.put(parseMarkdown('# Zoho note', {
  documentId: 'zoho-note',
}));
```

Zoho Creator 側の form / report 名や field 名は adapter 作成時に指定し、呼び出し側は `BackendAdapter` の共通 interface に揃えます。
