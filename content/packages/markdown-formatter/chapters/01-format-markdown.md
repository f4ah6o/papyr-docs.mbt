---
kind: chapter
slug: format-markdown
title: formatMarkdown
summary: formatMarkdown で Papyr Markdown subset を検証しつつ整形する。
emoji: 🧹
published: true
topics: [formatter, markdown]
chapterOrder: 1
updatedAt: 2026-04-25T00:00:00.000Z
---

# formatMarkdown

```ts
import { formatMarkdown } from '@f12o/papyr-markdown-formatter';

const output = formatMarkdown(inputMarkdown);
```

`formatMarkdown` は内部で `@f12o/papyr-markdown` の parser と serializer を使います。つまり「Papyr が表現できる Markdown か」を先に確認し、そのうえで **PapyrDocument に round-trip した結果** を返します。

## 使いどころ

- editor 保存時に Markdown の揺れをなくしたい
- CI で docs の構造を正規化したい
- `@f12o/papyr-cli` で JSON 化する前に、入力 Markdown を Papyr subset に揃えたい

対象外の構文が含まれている場合は例外になります。Papyr 独自 block を含む docs で「整形できた = Papyr で安全に扱える」と見なしたい場面に向いています。
