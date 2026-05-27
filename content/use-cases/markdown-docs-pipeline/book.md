---
kind: book
slug: markdown-docs-pipeline
title: 'Markdown リポジトリを Papyr docs pipeline に載せる'
summary: 'Markdown source を PapyrDocument に変換し、preview と search を載せた小さな docs pipeline を組む use case。'
emoji: 🏗️
published: true
topics: [use-case, markdown, preview, search]
updatedAt: 2026-05-01T00:00:00.000Z
---

# Markdown リポジトリを Papyr docs pipeline に載せる

この use case は、Markdown で持っている原稿を **build 時に `PapyrDocument` へ変換し、公開側では preview と search を組み合わせる** 最小構成を辿ります。

最初から大きな studio を作るのではなく、既存の docs repository に parser と index build を足したいケースを想定しています。

## この use case で見ること

1. Markdown source を `parseMarkdown` と CLI で `PapyrDocument` に変換する流れ
2. `renderDocumentPreview` で read-only 表示を作る流れ
3. `createMiniSearchAdapter` と build 済み index を使って検索を載せる流れ

## 先に辿るリンク

- [parse・build・preview・search をつなぐ](/books/markdown-docs-pipeline/parse-build-preview-search)
- [Getting Started を読む](/books/getting-started)
- [Papyr の公式 docs site を見る](/books/papyr-docs)

## 関連する docs

- [@f12o/papyr-markdown を見る](/books/markdown)
- [@f12o/papyr-core を見る](/books/core)
- [@f12o/papyr-preview を見る](/books/preview)
- [@f12o/papyr-search を見る](/books/search)
- [@f12o/papyr-adapter-fs を見る](/books/adapter-fs)
