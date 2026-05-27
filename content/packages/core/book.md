---
kind: book
slug: core
title: '@f12o/papyr-core'
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

```ts
import { parseDocument, headingBlock, paragraphBlock } from '@f12o/papyr-core';

const doc = parseDocument({
  id: 'hello',
  title: 'Hello Papyr',
  blocks: [
    headingBlock({
      id: 'h1',
      level: 1,
      content: [{ text: 'Hello Papyr' }],
    }),
    paragraphBlock({
      id: 'p1',
      content: [
        { text: 'PapyrDocument は ' },
        { text: 'JSON', marks: ['code'] },
        { text: ' として保存できます。' },
      ],
    }),
  ],
});

console.log(doc.blocks[0][0]); // 'Heading'
```

`parseDocument` は `unknown` な値を受け取り、`PapyrDocument` として扱える形だけを返します。不正な shape の場合は `PapyrDocumentValidationError` を throw します。

## PapyrDocument の形

`PapyrDocument` は top-level では小さな object です。`id` と `blocks` が必須で、`title` と `meta` は任意です。

```json
{
  "id": "hello",
  "title": "Hello Papyr",
  "blocks": [
    ["Heading", { "id": "h1", "level": 1, "content": [{ "text": "Hello Papyr" }] }],
    ["Paragraph", { "id": "p1", "content": [{ "text": "本文です。" }] }]
  ],
  "meta": {
    "publication": {
      "kind": "book",
      "section": "package",
      "slug": "hello",
      "summary": "最小の PapyrDocument。",
      "published": true,
      "topics": ["example"]
    }
  }
}
```

`blocks` の各要素は `[tag, payload]` という tuple variant 形式です。tag が block 種別で、payload がその block の data です。

## block 種別

| tag | 主な payload | Markdown との対応 |
| --- | --- | --- |
| `Heading` | `id`, `level`, `content` | `# h1` から `###### h6` |
| `Paragraph` | `id`, `content` | 通常の段落 |
| `List` | `id`, `ordered`, `items` | `- item` / `1. item` |
| `Code` | `id`, `language`, `source` | fenced code block |
| `Table` | `id`, `columns`, `rows`, `caption` | GFM table または `papyr-table` fence |
| `Mermaid` | `id`, `source`, `caption` | `mermaid` fence |
| `Excalidraw` | `id`, `elements`, `app_state`, `files`, `caption` | `papyr-excalidraw` fence |

Inline text は `{ text, marks?, href? }` の配列です。`marks` は `bold`、`italic`、`code`、`strike`、`link` を持てます。`link` を含める場合は `href` も必要です。

## JSON の例

```json
["Heading", { "id": "intro", "level": 2, "content": [{ "text": "Intro" }] }]
```

```json
[
  "List",
  {
    "id": "steps",
    "ordered": true,
    "items": [
      { "blocks": [["Paragraph", { "id": "s1", "content": [{ "text": "Parse Markdown" }] }]] },
      { "blocks": [["Paragraph", { "id": "s2", "content": [{ "text": "Render preview" }] }]] }
    ]
  }
]
```

```json
[
  "Table",
  {
    "id": "packages",
    "columns": [
      { "key": "package", "header": "Package" },
      { "key": "role", "header": "Role" }
    ],
    "rows": [
      [{ "text": "core" }, { "text": "document model" }],
      [{ "text": "preview" }, { "text": "browser rendering" }]
    ],
    "caption": "Papyr packages"
  }
]
```

## validation

```ts
import {
  isPapyrDocumentValidationError,
  parseDocument,
} from '@f12o/papyr-core';

try {
  parseDocument({ id: '', blocks: 'not blocks' });
} catch (error) {
  if (isPapyrDocumentValidationError(error)) {
    console.log(error.issues.map((issue) => issue.pathString));
  }
}
```

Validation は `id` が空でない文字列であること、`blocks` が配列であること、既知の block tag だけを含むこと、heading level や inline marks が契約内であることを確認します。Table、Mermaid、Excalidraw は renderer や editor が扱う payload を保持するため、core では tag と object payload の境界を主に確認します。
