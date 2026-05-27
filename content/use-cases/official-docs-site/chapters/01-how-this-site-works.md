---
kind: chapter
slug: how-this-site-works
title: この site の構成
summary: 'Papyr の公式 docs site が Markdown source、PapyrDocument、検索、公開導線をどう束ねているか。'
emoji: 🧭
published: true
topics: [use-case, docs, architecture]
chapterOrder: 1
updatedAt: 2026-05-05T00:00:00.000Z
---

# この site の構成

Papyr の公式 docs site は、ひとつの monorepo の中で **原稿、変換、描画、検索、公開** を分けて組み立てています。

## 1. 原稿は Markdown で持つ

原稿は `apps/docs/content/**/*.md` に置き、git で管理します。導入の入口は [Getting Started](/books/getting-started)、詳細は各 package book、更新情報は [articles](/articles) に分けています。

## 2. build 時に `PapyrDocument` へ変換する

`apps/docs/scripts/build-content.ts` が frontmatter を読み、Markdown 本文を
`@f12o/papyr-markdown` で `PapyrDocument` に変換します。ここで
publication metadata も manifest にまとめます。データモデルの土台は
[@f12o/papyr-core](/books/core)、Markdown 変換は
[@f12o/papyr-markdown](/books/markdown) が受け持ちます。

## 3. 実行時は preview と search を使う

公開側の client は build 済み JSON を読み、`@f12o/papyr-preview` で
描画し、`@f12o/papyr-search` で検索インデックスを扱います。詳しくは
[@f12o/papyr-preview](/books/preview) と
[@f12o/papyr-search](/books/search) を参照してください。

## 4. 編集体験は Playground で切り分ける

公開 docs 本体は read-only ですが、Papyr の編集体験は
[/playground](/playground) で試せます。ここでは
`@f12o/papyr-editor-ui` の workspace を使い、Markdown-visible editor と
block preview を一緒に確認できます。編集 UI の詳細は
[@f12o/papyr-editor-ui](/books/editor-ui) にあります。

## 5. 公開は Cloudflare 側へ寄せる

build で生成した manifest と document JSON を object storage へ置き、
Worker が読み出して配信します。この docs site では Cloudflare Workers
と R2 を使っています。Cloudflare 側の実装は
[@f12o/papyr-adapter-cloudflare](/books/adapter-cloudflare)、背景説明は
[@papyr の公式ドキュメントサイトを公開しました](/articles/introducing-papyr-docs)
にあります。

## 6. WebMCP で agent-ready にする

この site は browser が `navigator.modelContext` を持つ環境では、WebMCP tool として次も公開します。

- docs 本体の publication 一覧、raw Markdown 読み出し、全文検索、ページ navigation
- `/playground/advanced` 上の workspace 一覧、document 追加、preview navigation、publish

つまりこの docs site は、「人が読む site」であるだけでなく、**対応 browser 上では agent が構造化された tool 経由で docs を読む / advanced playground を操作する site** としても使えます。

## どこから読むとよいか

1. [Getting Started を読む](/books/getting-started)
2. [@f12o/papyr-core](/books/core) と [@f12o/papyr-markdown](/books/markdown) で中心モデルを押さえる
3. この site で必要になった層だけ preview / search / editor-ui / adapter-cloudflare を読む
