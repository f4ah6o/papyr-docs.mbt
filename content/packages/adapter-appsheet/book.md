---
kind: book
slug: adapter-appsheet
title: '@f12o/papyr-adapter-appsheet'
summary: AppSheet table へ PapyrDocument を保存する BackendAdapter。
emoji: 📱
published: true
topics: [backend, appsheet]
updatedAt: 2026-04-26T00:00:00.000Z
---

# @f12o/papyr-adapter-appsheet

`@f12o/papyr-adapter-appsheet` は、AppSheet API の Action endpoint を `BackendAdapter` として包む
package です。Papyr からは document CRUD に見えますが、内部では AppSheet の row を
`papyrId` と `papyrDoc` の 2 列で扱います。

業務アプリとしてすでに AppSheet を使っている環境で、PapyrDocument を同じ table に載せたいときの
橋渡しになります。

## 最小コード

```ts
import { createAppSheetAdapter } from '@f12o/papyr-adapter-appsheet';
import { parseMarkdown } from '@f12o/papyr-markdown';

const adapter = createAppSheetAdapter({
  appId: 'your-app-id',
  tableName: 'Documents',
  accessKey: process.env.APPSHEET_ACCESS_KEY!,
  idColumn: 'papyrId',
  documentColumn: 'papyrDoc',
});

await adapter.put(parseMarkdown('# AppSheet note', {
  documentId: 'appsheet-note',
}));
```

AppSheet の row 操作は adapter 内に閉じ込め、Papyr 側では document CRUD として扱います。
