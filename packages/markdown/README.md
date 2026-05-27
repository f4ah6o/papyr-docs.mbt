# @f12o/papyr-markdown

Papyr Markdown 変換（table / excalidraw 向けカスタムフェンス対応）

Papyr monorepo の一部です。詳細は [リポジトリ ROOT README](https://github.com/f4ah6o/papyr#readme) を参照してください。

## Features

- Parses a strict subset of GFM Markdown into Papyr document structure
- **Strict validation**: Explicitly rejects unsupported Markdown constructs (footnotes, task lists, images, HTML, etc.) instead of silently dropping them
- Serializes Papyr documents back to Markdown
- Supports custom fenced code blocks for tables and Excalidraw diagrams

## Install

```sh
npm install @f12o/papyr-markdown
```

## License

MIT
