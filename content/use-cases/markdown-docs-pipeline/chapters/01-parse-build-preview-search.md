---
kind: chapter
slug: parse-build-preview-search
title: parse・build・preview・search をつなぐ
summary: 'Markdown source から PapyrDocument、preview、MiniSearch index までの最小パイプライン。'
emoji: 🔗
published: true
topics: [use-case, markdown, search]
chapterOrder: 1
updatedAt: 2026-05-01T00:00:00.000Z
---

# parse・build・preview・search をつなぐ

Papyr の docs pipeline は、1 つの巨大 package ではなく、小さな層を順につなぐ構成です。最小限なら次の順で組めます。

1. Markdown source を `@f12o/papyr-markdown` で parse する
2. `@f12o/papyr-core` の validation を通した `PapyrDocument` を build artifact にする
3. 公開側で `@f12o/papyr-preview` を使って描画する
4. `@f12o/papyr-search` で検索 index を持つ

## 1. 変換は library か CLI で始める

Node.js から直接組むなら `parseMarkdown(input, { documentId })` を呼びます。shell から先に確かめたい場合は `papyr markdown-to-json` を使います。

```sh
papyr markdown-to-json --recurse docs --out-dir papyr-json --id-strategy relative-path
papyr markdown-to-json --glob "docs/**/*.md" --validate-only --id-strategy relative-path
```

validation 失敗時は field path 付きの error が返るので、Markdown subset に収まっていない箇所を CI で止めやすくなります。

## 2. build artifact は file system から始めてよい

最初は `@f12o/papyr-adapter-fs` で `PapyrDocument` を `dir/<encoded-id>.json` に置くだけでも十分です。repo 内 build やローカル preview server では、adapter を使って JSON artifact を読み出す形にしておくと、後で別 backend へ寄せやすくなります。

## 3. preview と search は公開側で合流する

read-only 表示は `renderDocumentPreview(container, doc)` で作れます。検索は `createMiniSearchAdapter()` を使い、build 済み JSON から document を流し込むのが簡単です。

小から中規模の docs site では、build 時に index 対象配列を作ってブラウザ配信し、client-side search に寄せる構成が素直です。document 数が増えたら backend 側の `search` へ移しても、`PapyrDocument` 自体の流れは変わりません。
