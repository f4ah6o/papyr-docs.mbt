---
kind: article
slug: introducing-papyr-docs
title: '@papyr の公式ドキュメントサイトを公開しました'
summary: '@papyr のドキュメントを @papyr 自身で作り、Cloudflare Workers にデプロイしました。'
emoji: 🎉
published: true
topics: [release, docs]
updatedAt: 2026-04-26T00:00:00.000Z
---

# @papyr の公式ドキュメントサイトを公開しました

@papyr は、Markdown を書く人、JSON として保存したい人、表示や検索の UI を自分で組みたい人を分けて扱うために作っています。公式ドキュメントサイトも同じ前提で、@papyr 自身のパッケージだけを使って構成しました。

## このサイトの構成

- コンテンツの原本は `apps/docs/content/**/*.md` にある Markdown です。
- ビルド時に `@f12o/papyr-markdown` の `parseMarkdown` で `PapyrDocument` へ変換し、公開用 JSON と manifest を生成します。
- 変換後の JSON と原本 Markdown は Cloudflare R2 に upload し、Cloudflare Workers から配信します。
- 検索は `@f12o/papyr-search` の MiniSearch 実装をクライアントサイドで起動しています。
- プレビュー表示は `@f12o/papyr-preview` の renderer を使っています。
- `/playground` では `@f12o/papyr-editor` と `@f12o/papyr-editor-ui` を組み合わせ、Markdown-visible
  editor と table / Mermaid / Excalidraw の embedded preview を 1 画面で切り替えずに試せます。

## 読む人と書く人の導線

このサイトで紹介している構成は、そのまま Papyr の導入例です。

1. 原稿は Markdown として git 管理できる
2. 実行時は `PapyrDocument` JSON を使って検索・表示・配信できる
3. 必要なら URL の末尾に `.md` を付けて原文 Markdown もそのまま確認できる

まずは `Getting Started` から読むと、最小構成で Papyr を触り始める流れが分かります。その後に `@f12o/papyr-core` と `@f12o/papyr-markdown` を読むと、Papyr の中心になるデータモデルと変換レイヤーを把握できます。
