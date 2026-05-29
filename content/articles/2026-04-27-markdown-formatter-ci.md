---
kind: article
slug: markdown-formatter-ci
title: "CI で Markdown を自動整形する @f12o/papyr-markdown-formatter"
summary: "@f12o/papyr-markdown-formatter を使うと、Papyr のブロック構造を壊さずに Markdown を正規化できます。Node.js スクリプトから呼び出して CI に組み込めます。"
emoji: 🛠️
published: true
topics: [ci, markdown, formatter]
updatedAt: 2026-04-28T00:00:00.000Z
---

# CI で Markdown を自動整形する @f12o/papyr-markdown-formatter

`@f12o/papyr-markdown-formatter` は、Papyr が lossless に扱える Markdown subset だけを対象にした formatter です。Mermaid や Moonlight のような Papyr 独自 block を壊さずに整形したい場合は、汎用 formatter よりこちらを先に通す方が安全です。基本 API は [`formatMarkdown`](/books/markdown-formatter/format-markdown) ひとつだけです。

## できること

- 見出しレベルや空行のばらつきを統一する
- リスト記法（`-` / `*` / `+`）を `*` に揃える
- Papyr 独自フェンス（`papyr-moonlight`、`papyr-table` など）を壊さずに通す
- `PapyrDocument` を経由するので、整形前後で document model が一致することを保証できる

Papyr subset に含まれない構文（blockquote、画像など）が含まれている場合は例外を投げます。「整形できた = Papyr で安全に扱える」と見なせるので、CI で入力を検証する入り口にもなります。

## Node.js API で使う

```ts
import { formatMarkdown } from "@f12o/papyr-markdown-formatter";

const formatted = formatMarkdown(source);
```

`formatMarkdown(source)` は整形済み Markdown 文字列を返します。Papyr subset に含まれない構文がある場合は例外になるので、CI の入力検証にもそのまま使えます。

## CI での使い方

追加依存を増やしたくないなら、Node.js built-ins だけで check script を書くのが簡単です。

```js
// scripts/check-format.mjs
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { formatMarkdown } from "@f12o/papyr-markdown-formatter";

const root = "apps/docs/content";
const shouldWrite = process.argv.includes("--write");
let hasError = false;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
      continue;
    }
    if (entry.isFile() && fullPath.endsWith(".md")) {
      yield fullPath;
    }
  }
}

for await (const file of walk(root)) {
  const original = await readFile(file, "utf8");
  const formatted = formatMarkdown(original);

  if (original === formatted) continue;

  if (shouldWrite) {
    await writeFile(file, formatted, "utf8");
    console.error(`formatted: ${file}`);
    continue;
  }

  console.error(`needs formatting: ${file}`);
  hasError = true;
}

if (hasError) process.exitCode = 1;
```

CI では check mode、ローカルでは `--write` を付けて自動修正、という 2 つの使い方に分けられます。

```bash
node scripts/check-format.mjs
node scripts/check-format.mjs --write
```

## GitHub Actions での設定例

```yaml
- name: Check Papyr Markdown formatting
  run: node scripts/check-format.mjs
```

pull request で整形差分が混ざった時点で失敗させられるので、レビューで毎回 Markdown の揺れを指摘する必要がなくなります。

## Prettier / markdownlint との使い分け

- Prettier は汎用フォーマッタです。Papyr block の意味は知りません。
- markdownlint は style rule の統一に向いています。
- `@f12o/papyr-markdown-formatter` は Papyr block を理解した上で Markdown を正規化します。

3 つを併用する場合、`@f12o/papyr-markdown-formatter` を先に通してから Prettier を当てるのが安全です。Papyr 管理下の Markdown に Prettier を直接当てたくない場合は、対象ディレクトリを除外しておくと運用しやすくなります。

```txt
# .prettierignore
apps/docs/content/**/*.md
```
