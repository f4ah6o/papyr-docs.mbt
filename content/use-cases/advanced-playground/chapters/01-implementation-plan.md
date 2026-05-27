---
kind: chapter
slug: implementation-plan
title: 実装プラン
summary: 'Advanced Playground を OPFS / browser DB / exportable bundle まで拡張するための段階的な計画。'
emoji: 🗺️
published: true
topics: [use-case, playground, architecture, opfs]
chapterOrder: 1
updatedAt: 2026-05-01T00:00:00.000Z
---

# 実装プラン

## 0. まず前提を固定する

`papyr.f12o.com` 側には autosave や analytics を送りません。browser 内の
source of truth は OPFS に置きます。`PapyrDocument` を中心にしつつ、
site 設定と asset manifest は別 document として持ちます。export した
bundle は adapter 非依存の中間形式にします。

## 1. storage 層を増やす

最初に必要なのは UI ではなく adapter です。`@f12o/papyr-backend` の CRUD 契約に合わせて、browser 内で完結する adapter 群を足します。

`@f12o/papyr-adapter-opfs` は document JSON と asset を OPFS に保存します。
`@f12o/papyr-adapter-browser-db` は SQLite か DuckDB を使って list / search
用 index を持ちます。`@f12o/papyr-adapter-browser-workspace` は OPFS と
browser DB を束ね、workspace 単位で扱う façade です。

これで `apps/docs` 以外の app からも同じ browser storage を再利用できます。

## 2. workspace の最小モデルを切り出す

advanced playground では単一 Markdown では足りないので、少なくとも次を持てる必要があります。

article / book / chapter の `PapyrDocument`、site title、navigation、theme
などの site settings、asset manifest、export metadata
（format version、createdAt、updatedAt）を持てる必要があります。

このモデルは React UI から独立させ、`packages/*` に置いて test しやすくします。

## 3. import / export を先に定義する

他の adapter へ持ち出せることが要件なので、UI 完成前に bundle format を固定します。

`documents/*.json` には serialized `PapyrDocument`、`site.json` には
site 設定、`assets/*` には画像や添付、`manifest.json` には version、
entrypoint、topic、更新日時を入れます。

最初の export は zip download だけで十分です。import は同じ bundle を読み戻せればよく、Cloudflare や FS adapter への変換は後続の CLI / app で扱えます。

## 4. `apps/docs` に advanced UI を段階導入する

既存の `/playground` は「1 枚の Markdown を試す」用途として残し、advanced playground は別導線で増やすのが安全です。

1. workspace selector と document list
2. selected document を `EditorWorkspace` で編集
3. site settings / navigation editor
4. export / import ボタン
5. local preview と publish adapter への handoff

この順なら、既存 playground を壊さずに authoring 機能を広げられます。

## 5. 不足機能をこの順で開発する

1. browser adapter packages
2. bundle schema と export / import helper
3. advanced playground state management
4. local preview / search index rebuild
5. adapter handoff（例: FS, Cloudflare）

最初から deploy まで含めず、browser 内で書ける、閉じても残る、外へ
持ち出せることを最初の完成条件にします。
