---
kind: chapter
slug: renderer
title: renderDocumentPreview
summary: renderDocumentPreview と Moonlight SVG sanitizing で Papyr preview を組み込む。
emoji: 🖼️
published: true
topics: [preview, mermaid, moonlight]
chapterOrder: 1
updatedAt: 2026-04-25T00:00:00.000Z
---

# renderDocumentPreview

```ts
import { renderDocumentPreview } from "@f12o/papyr-preview";

await renderDocumentPreview(container, doc);
```

`renderDocumentPreview` は `PapyrDocument` の block をたどって DOM を
組み立てます。`heading`、`paragraph`、`list`、`code`、`table` に加えて、
Mermaid は動的 import で SVG 化し、Moonlight は保存済み SVG を検査してから
表示します。

## renderer の特徴

`doc.blocks.length === 0` のときは空状態メッセージを描画します。link
mark は `target="_blank"` と `rel="noreferrer"` で出力します。Mermaid
描画失敗時は例外を握りつぶさず、エラーメッセージを preview 内に表示します。

Moonlight SVG は `<script>` や event handler 属性を落としてから preview に入れます。
VS Code extension や docs site のように、編集 UI と preview を分けつつ同じ
document model を描画したい場面で使いやすい package です。
