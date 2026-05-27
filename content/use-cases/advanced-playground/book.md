---
kind: book
slug: advanced-playground
title: 'Advanced Playground'
summary: 'OPFS 上に docs site の原稿と設定を保存し、ブラウザだけで編集・書き出しし、必要なら WebMCP からも操作するための実装プラン。'
emoji: 🧱
published: true
topics: [use-case, playground, opfs, browser]
updatedAt: 2026-05-05T00:00:00.000Z
---

# Advanced Playground

この use case は、現在の `/playground` を「Markdown を 1 枚試す場所」から、**ブラウザだけで独自の docs site を構築する authoring workspace** へ拡張するための実装プランです。

## 目標

- ユーザーが独自のドキュメントサイトを構築し、記事を書ける
- 記事、設定、検索用 index、DB は OPFS に保存し、`papyr.f12o.com` へ送信しない
- 作成したデータを download し、他の adapter や deployment に持ち出せる

## 現状との差分

今の `/playground` は local-only ですが、保存対象は `localStorage` 上の単一 Markdown source です。複数 document、site 設定、asset、import / export、adapter 差し替えまではまだ扱っていません。

## この use case で決めること

1. browser 内 workspace の最小データモデル
2. OPFS と browser DB を使う storage adapter の切り方
3. import / export して他の adapter へつなぐ境界
4. `apps/docs` に載せる advanced UI の段階的な作り方

## 先に辿るリンク

- [実装プランを見る](/books/advanced-playground/implementation-plan)
- [現在の Playground を開く](/playground)
- [@f12o/papyr-backend を見る](/books/backend)
- [@f12o/papyr-editor-ui を見る](/books/editor-ui)

対応 browser では `/playground/advanced` 自体が WebMCP tool を公開するので、workspace の切り替え、document 追加、preview navigation、publish を agent からも呼び出せます。
