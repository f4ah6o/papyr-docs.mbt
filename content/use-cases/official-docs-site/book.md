---
kind: book
slug: papyr-docs
title: 'Papyr の公式 docs site'
summary: 'Papyr で Papyr 自身の docs を構築する dogfooding use case。構成、導線、公開方法を実例として辿れます。'
emoji: 🧪
published: true
topics: [use-case, docs, dogfooding]
updatedAt: 2026-04-29T00:00:00.000Z
---

# Papyr の公式 docs site

この book は、`apps/docs` を「Papyr で Papyr 自身の docs を構築する」実例として辿る入口です。package ごとの説明を並べるだけではなく、複数の package と公開導線をどう組み合わせるかを、この docs site 自体で確認します。

## articles と use-cases の違い

- `articles` はトピック単位の読み物です。リリースや特定テーマの背景を短く伝えます。
- `use-cases` は順序を辿れる構造化ウォークスルーです。どこから読み始めて、何を見れば全体像が掴めるかを入口として整理します。

既存の [@papyr の公式ドキュメントサイトを公開しました](/articles/introducing-papyr-docs) は背景説明として残し、この book では docs site 全体をひとつの実例として辿ります。

## この use case で見ること

1. Markdown source をどのように `PapyrDocument` に変換しているか
2. package docs、Getting Started、articles、Playground をどう 1 つの site に束ねているか
3. build した JSON と manifest をどう公開しているか

## 先に辿るリンク

- [この site の構成を見る](/books/papyr-docs/how-this-site-works)
- [Getting Started を読む](/books/getting-started)
- [Playground を開く](/playground)
- [紹介 article を読む](/articles/introducing-papyr-docs)

## 関連する docs

- [@f12o/papyr-core を見る](/books/core)
- [@f12o/papyr-markdown を見る](/books/markdown)
- [@f12o/papyr-preview を見る](/books/preview)
- [@f12o/papyr-search を見る](/books/search)
- [@f12o/papyr-editor-ui を見る](/books/editor-ui)
- [@f12o/papyr-adapter-cloudflare を見る](/books/adapter-cloudflare)
