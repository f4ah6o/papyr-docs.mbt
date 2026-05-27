---
kind: chapter
slug: install
title: インストール
summary: 'pnpm monorepo に @f12o/papyr-* を追加して最初のビルドを通すまでの手順。'
emoji: 📦
published: true
topics: [install, pnpm]
chapterOrder: 1
updatedAt: 2026-04-26T00:00:00.000Z
---

# インストール

最初は `@f12o/papyr-core`、`@f12o/papyr-markdown`、必要なら `@f12o/papyr-preview` の 3 つから始めるのが分かりやすいです。Papyr の各 package は小さく分かれているので、用途に応じて追加します。

```sh
pnpm add @f12o/papyr-core @f12o/papyr-markdown @f12o/papyr-preview
```

## 追加 package の目安

ブラウザで preview を出したいなら `@f12o/papyr-preview`、
クライアントサイド検索を入れたいなら `@f12o/papyr-search` を追加します。
TipTap の headless schema や converter を使いたいなら
`@f12o/papyr-editor`、Markdown-visible editor workspace をそのまま
埋め込みたいなら `@f12o/papyr-editor-ui` が向いています。Markdown を
CI や保存前に正規化したい場合は `@f12o/papyr-markdown-formatter` を
追加してください。

`@f12o/papyr-editor` は headless 層で、`@f12o/papyr-editor-ui` はその上に
載る React UI です。

## ツールと保存先

保存先 interface をそろえるなら `@f12o/papyr-backend`、
Markdown と JSON を terminal で相互変換したいなら `@f12o/papyr-cli` を
使います。保存先 adapter は `@f12o/papyr-adapter-fs`、
`adapter-airtable`、`adapter-appsheet`、`adapter-kintone`、
`adapter-zoho-creator`、`adapter-cloudflare` から選べます。

## インストール後の確認

依存を追加したら、まず型チェックとビルドが通ることを確認します。

```sh
pnpm -r typecheck
pnpm -r build
```

ここが通れば、次は Markdown から最初の `PapyrDocument` を作る段階に進めます。
