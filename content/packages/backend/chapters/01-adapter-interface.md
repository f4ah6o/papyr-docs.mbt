---
kind: chapter
slug: adapter-interface
title: BackendAdapter
summary: list / get / put / delete / search の 5 メソッドで構成されるインターフェース。
emoji: 📐
published: true
topics: [backend]
chapterOrder: 1
updatedAt: 2026-04-24T00:00:00.000Z
---

# BackendAdapter

```ts
interface BackendAdapter {
  list(query?: ListQuery): Promise<ListResult>;
  get(id: string): Promise<PapyrDocument | null>;
  put(doc: PapyrDocument): Promise<void>;
  delete(id: string): Promise<void>;
  search?(query: string): Promise<SearchHit[]>;
}
```

## 各メソッドの役割

`list` は一覧取得で、`limit`、`cursor`、`filter` を受け取れます。`get`
は単一 document の取得、`put` は document 全体の upsert、`delete` は
document の削除です。`search?` は必要なら server-side search を追加
できる拡張点です。

`ListQuery.filter` は intentionally 緩くしてあり、adapter ごとに好きな filter を解釈できます。たとえば Cloudflare D1 adapter なら SQL ベース、kintone adapter なら kintone query ベース、といった差し替えが可能です。

`search` は任意実装です。クライアントサイドで `@f12o/papyr-search` を使う場合は、adapter 側では実装せず、ブラウザで `list` の結果を流し込んで検索する構成が無理なく動きます。

逆に、document 数が多くなってブラウザで index を持ちたくない場合は、adapter 側の `search` を実装して検索責務を backend に寄せると設計しやすくなります。
