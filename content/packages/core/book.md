---
kind: book
slug: core
title: "@f12o/papyr-core"
summary: ドキュメントモデル、ブロックスキーマ、レンダラーインターフェースの土台パッケージ。
emoji: 🪵
published: true
topics: [core, model]
updatedAt: 2026-04-24T00:00:00.000Z
---

# @f12o/papyr-core

`@f12o/papyr-core` は、Papyr の他 package が共有する **最小の契約** です。`PapyrDocument` 型、各 block schema、`parseDocument`、`Renderer` interface はすべてここにあります。

この package を先に理解しておくと、Papyr 全体の見通しが良くなります。

- `@f12o/papyr-markdown` は Markdown を `PapyrDocument` に変換する
- `@f12o/papyr-preview` は `PapyrDocument` を描画する
- `@f12o/papyr-backend` は `PapyrDocument` の保存先を抽象化する
- `@f12o/papyr-editor` は `PapyrDocument` と editor state を相互変換する

つまり `@f12o/papyr-core` は、**Papyr の各レイヤーを疎結合に保つための共通言語**です。Markdown parser や renderer の実装詳細を知らなくても、`PapyrDocument` を受け渡すだけで組み合わせられます。

実行時に unknown な JSON を受け取る場面では、`parseDocument` で schema validation してから扱うのが基本です。

## 最小コード

`parseDocument` は `unknown` な値を検証します。

## parseDocument の例

```ts
import { parseDocument, headingBlock } from "@f12o/papyr-core";

const doc = parseDocument({
  id: "hello",
  title: "Hello Papyr",
  blocks: [
    headingBlock({ id: "h1", level: 1, content: [{ text: "Hello" }] }),
  ],
});

console.log(doc.blocks[0][0]); // 'Heading'
```

不正な shape の場合は `PapyrDocumentValidationError` を throw します。

## PapyrDocument の形

`PapyrDocument` は top-level では小さな object です。

```json
{
  "id": "hello",
  "blocks": [
    ["Heading", { "id": "h1", "level": 1, "content": [{ "text": "Hello" }] }]
  ]
}
```

`id` と `blocks` が必須で、`title` と `meta` は任意です。

## tuple variant

`blocks` の各要素は `[tag, payload]` という tuple variant 形式です。tag が block 種別で、payload がその block の data です。

## 基本 block

| tag         | Markdown との対応       |
| ----------- | ----------------------- |
| `Heading`   | `# h1` から `###### h6` |
| `Paragraph` | 通常の段落              |
| `List`      | `- item` / `1. item`    |
| `Code`      | fenced code block       |

## embedded block

| tag         | 主な payload           | Markdown との対応       |
| ----------- | ---------------------- | ----------------------- |
| `Table`     | `columns`, `rows`      | `papyr-table` fence     |
| `Mermaid`   | `source`, `caption`    | `mermaid` fence         |
| `Moonlight` | `svg`, `caption`       | `papyr-moonlight` fence |

## inline text

Inline text は `{ text, marks?, href? }` の配列です。`marks` は `bold`、`italic`、`code`、`strike`、`link` を持てます。`link` を含める場合は `href` も必要です。

## JSON の例: Heading

```json
["Heading", { "id": "intro", "level": 2, "content": [{ "text": "Intro" }] }]
```

## JSON の例: List

```json
[
  "List",
  {
    "id": "steps",
    "ordered": true,
    "items": [
      { "blocks": [["Paragraph", { "id": "s1", "content": [{ "text": "Parse" }] }]] },
      { "blocks": [["Paragraph", { "id": "s2", "content": [{ "text": "Render" }] }]] }
    ]
  }
]
```

## JSON の例: Table

Table payload は `caption` も任意で持てます。

```json
[
  "Table",
  {
    "id": "packages",
    "columns": [
      { "key": "package", "header": "Package" },
      { "key": "role", "header": "Role" }
    ],
    "rows": [[{ "text": "core" }, { "text": "document model" }]]
  }
]
```

## validation

```ts
import {
  isPapyrDocumentValidationError,
  parseDocument,
} from "@f12o/papyr-core";

try {
  parseDocument({ id: "", blocks: "not blocks" });
} catch (error) {
  if (isPapyrDocumentValidationError(error)) {
    console.log(error.issues.map((issue) => issue.pathString));
  }
}
```

Validation は `id`、`blocks`、既知の block tag、heading level、inline marks を確認します。Table、Mermaid、Moonlight は core では tag と object payload の境界を主に確認します。
