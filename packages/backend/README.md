# @f12o/papyr-backend

Papyr バックエンドアダプタのインターフェース

Papyr monorepo の一部です。詳細は [リポジトリ ROOT README](https://github.com/f4ah6o/papyr#readme) を参照してください。

## Install

```sh
npm install @f12o/papyr-backend
```

## Portable contract

`BackendAdapter` は「全部の adapter が同じ query 言語や同じ storage 特性を持つ」ことは要求しません。代わりに、次の baseline semantics だけを portable contract として共有します。

| API | Portable に期待してよいこと |
| --- | --- |
| `list(query?)` | `PapyrDocument[]` を返す。`limit` を指定した場合は returned items 数の upper bound として扱い、`limit: 0` は空 page を返す。`nextCursor` は opaque token で、返された場合だけ次の `list({ cursor })` に渡せる。順序は adapter-specific。 |
| `get(id)` | document が無ければ `null` を返す。 |
| `put(doc)` | `doc.id` を key として create / replace する。 |
| `delete(id)` | document が既に無くても安全に呼べる。 |
| `search?(query)` | optional capability。実装する場合は better-to-worse order の `SearchHit[]` を返し、各 hit は `id` と numeric `score` を持つ。`snippet` は optional。 |

## Portable ではないもの

次は intentionally adapter-specific です。

- `filter` の shape / dialect / operator semantics
- backend-specific ordering guarantees
- backend-native pagination token format
- backend-imposed page size caps
- search relevance model や snippet 生成方法

そのため、cross-adapter な code は portable contract だけに依存し、`filter` や ordering の詳細は個別 adapter docs / implementation を前提にしてください。

## Conformance suite

custom adapter や既存 adapter test では、shared helper を使って portable contract を再利用できます。

```ts
import { assertBackendAdapterConformance } from '@f12o/papyr-backend/testing';
import { createFsAdapter } from '@f12o/papyr-adapter-fs';

await assertBackendAdapterConformance({
  createAdapter: () => createFsAdapter({ dir: '/tmp/papyr-docs' }),
});
```

pagination を portable contract として検証したい adapter では `supportsPagination: true` を指定してください。`search` を実装する adapter では `search` expectation を与えることで hit shape / ordering の最低契約も test できます。

## License

MIT
