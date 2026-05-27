---
kind: chapter
slug: blocks
title: ブロックスキーマ
summary: 標準ブロックの一覧と、TableBlock / ExcalidrawBlock / MermaidBlock の扱い。
emoji: 🧩
published: true
topics: [blocks]
chapterOrder: 2
updatedAt: 2026-04-24T00:00:00.000Z
---

# ブロックスキーマ

Papyr で標準サポートしている block は次の 7 種類です。

| 種類         | 主なフィールド                          |
| ------------ | --------------------------------------- |
| `paragraph`  | `content: Inline[]`                     |
| `heading`    | `level: 1-6`, `content: Inline[]`       |
| `list`       | `ordered: boolean`, `items: ListItem[]` |
| `code`       | `language?`, `source`                   |
| `table`      | `columns`, `rows`                       |
| `mermaid`    | `source`, `caption?`                    |
| `excalidraw` | `elements`, `caption?`                  |

`Inline` は `{ text, marks?, href? }` という shape で、`marks` には `bold` / `italic` / `code` / `strike` / `link` を含められます。

## 設計上のポイント

- `paragraph` / `heading` / `code` は Markdown から自然に来る基本 block
- `table` / `mermaid` / `excalidraw` は「Markdown だけでは情報を落としやすいもの」を構造化した block
- `list` の `items` は `blocks: Block[]` を持つので、リスト項目の中に code block や table を入れられる

特に `list` が inline の配列ではなく block の配列を持つ点は、通常の Markdown editor と Papyr の差分です。手順書や設計メモで「箇条書きの途中に図やコードを差し込む」用途をそのまま表現できます。

`table` と `excalidraw` を JSON で保持するのも同じ理由です。見た目だけ Markdown に落とすのではなく、**再編集できる構造を残す** ことを優先しています。
