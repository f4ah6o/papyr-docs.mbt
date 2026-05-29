---
kind: chapter
slug: first-document
title: 最初のドキュメント
summary: parseMarkdown で PapyrDocument を作り、ブロックの構造を確認する。
emoji: 📝
published: true
topics: [quickstart, markdown]
chapterOrder: 2
updatedAt: 2026-04-24T00:00:00.000Z
---

# 最初のドキュメント

Papyr を触り始める最短ルートは、Markdown 文字列を `PapyrDocument` に変換して、その JSON と描画結果を両方見ることです。

```ts
import { parseMarkdown, serializeDocument } from "@f12o/papyr-markdown";
import { renderDocumentPreview } from "@f12o/papyr-preview";

const markdown = `# Hello Papyr

これは **Papyr** の最初のドキュメントです。

- Markdown から作る
- JSON として保存できる
`;

const doc = parseMarkdown(markdown, {
  documentId: "hello-papyr",
});

console.log(doc.id); // 'hello-papyr'
console.log(JSON.stringify(doc)); // PapyrDocument JSON
console.log(serializeDocument(doc)); // Markdown に戻せる

await renderDocumentPreview(document.querySelector("#preview")!, doc);
```

この例で見ておきたいのは次の 3 点です。

1. `parseMarkdown` は Markdown 本文から `PapyrDocument` を作る
2. `serializeDocument` は block 列を Markdown に戻せる
3. `renderDocumentPreview` を使うと、HTML renderer を自分で書かなくてもブラウザ表示を始められる

`PapyrDocument` はそのまま JSON で保存できます。永続化するときは `@f12o/papyr-backend` の adapter に渡すだけで済むので、「編集中は Markdown、実行時は JSON」という構成を取りやすいのが Papyr の特徴です。

表や Moonlight のような Markdown 標準外の構造は、Papyr 独自 block と特殊フェンスで扱います。ここが Papyr の導入判断でいちばん大事なポイントで、**見た目だけ Markdown っぽくするのではなく、構造を JSON で失わない** 方針を取っています。
