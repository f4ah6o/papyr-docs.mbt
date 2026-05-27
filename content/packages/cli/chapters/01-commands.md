---
kind: chapter
slug: commands
title: コマンド一覧
summary: markdown-to-json / json-to-markdown と stdin/stdout の使い方。
emoji: ⌨️
published: true
topics: [cli, commands]
chapterOrder: 1
updatedAt: 2026-04-25T00:00:00.000Z
---

# コマンド一覧

```sh
papyr markdown-to-json README.md README.json
papyr markdown-to-json README.md --document-id readme
papyr json-to-markdown README.json README.md
```

`papyr` には次の 2 つの主コマンドがあります。

`markdown-to-json` は Markdown を `PapyrDocument` JSON に変換し、
`json-to-markdown` は `PapyrDocument` JSON を Markdown に戻します。

## 補足

`markdown-to-json` は `--document-id <id>` を受け取れます。input / output
を省略するか `-` にすると stdin / stdout を使います。短縮 alias として
`md-to-json` と `json-to-md` も使えます。

JSON 側は `@f12o/papyr-core` の validation API で検証されるので、CLI を通した時点で PapyrDocument として妥当かを確認できます。失敗時は `blocks.0.level` のような field path と `expected` / `received` が分かる形でエラーが出るので、変換パイプラインを shell script に置いたときも原因を追いやすくなっています。
