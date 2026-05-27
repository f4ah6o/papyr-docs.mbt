# @f12o/papyr-core

Papyr core: ドキュメントモデル、ブロックスキーマ、レンダラーインターフェース

Papyr monorepo の一部です。詳細は [リポジトリ ROOT README](https://github.com/f4ah6o/papyr#readme) を参照してください。

## Install

```sh
npm install @f12o/papyr-core
```

## Validation

```ts
import { validateDocument } from '@f12o/papyr-core';

const result = validateDocument(JSON.parse(raw));
if (!result.success) {
  console.error(result.issues.map((issue) => issue.pathString));
  throw result.error;
}

const doc = result.document;
```

`parseDocument(input)` も引き続き使えますが、invalid input を UI / CLI / server で扱い分けたい場合は `validateDocument(input)` が向いています。

`parseDocument(input)` は従来どおり Valibot の `ValiError` を投げます。catch した error を `formatDocumentValidationError(error)` に渡すと、Papyr 向けの field-path-aware なメッセージに整形できます。

## License

MIT
