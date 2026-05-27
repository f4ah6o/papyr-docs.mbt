---
kind: book
slug: getting-started
title: Getting Started
summary: '@papyr を最短で触るための導入ガイド。インストール、最初のドキュメント、backend 接続、Playground まで。'
emoji: 🚀
published: true
topics: [getting-started, overview]
updatedAt: 2026-04-26T00:00:00.000Z
---

# Getting Started

@papyr は「保存形式」「編集 UI」「検索」「公開方法」を一体化せず、`PapyrDocument` を中心に分割して使うドキュメント基盤です。最初から全部を入れる必要はありません。Markdown を読んで JSON にし、表示し、必要になった段階で保存先や検索を足します。

この guide は、初回に必要な順番だけを残しています。

1. `@f12o/papyr-core` と `@f12o/papyr-markdown` を入れて Markdown から `PapyrDocument` を作る
2. `@f12o/papyr-preview` を足してブラウザに描画する
3. 永続化が必要になったら `@f12o/papyr-backend` と adapter を API endpoint / Worker につなぐ
4. 編集体験を先に見たいときは Playground で `@f12o/papyr-editor-ui` を試す
5. 検索や本格的な編集が必要になったら `@f12o/papyr-search` / `@f12o/papyr-editor` / `@f12o/papyr-editor-ui` を足す

Papyr は Markdown editor でも CMS でもありません。Markdown を JSON ドキュメントとして扱い、表示・検索・保存の実装を後から選ぶための土台です。

## 最初に動かすコード

```ts
import { parseDocument } from '@f12o/papyr-core';
import { parseMarkdown, serializeDocument } from '@f12o/papyr-markdown';
import { renderDocumentPreview } from '@f12o/papyr-preview';

const source = `# Hello Papyr

Markdown から PapyrDocument を作ります。
`;

const doc = parseMarkdown(source, { documentId: 'hello-papyr' });
const checked = parseDocument(doc);

console.log(checked.id);
console.log(serializeDocument(checked));

await renderDocumentPreview(document.querySelector('#preview')!, checked);
```

この 1 つの流れで、Markdown source、`PapyrDocument` JSON、preview renderer の境界を確認できます。
