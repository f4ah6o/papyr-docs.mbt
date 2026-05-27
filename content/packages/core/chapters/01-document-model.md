---
kind: chapter
slug: document-model
title: ドキュメントモデル
summary: PapyrDocument と Block 型の構造、meta の役割。
emoji: 🧱
published: true
topics: [model, schema]
chapterOrder: 1
updatedAt: 2026-04-24T00:00:00.000Z
---

# ドキュメントモデル

Papyr の中心にあるのは `PapyrDocument` です。構造は小さく、拡張点は `meta` に寄せています。

```ts
type PapyrDocument = {
  id: string;
  title?: string;
  blocks: Block[];
  meta?: Record<string, unknown>;
};
```

## 各フィールドの役割

`id` は保存、検索、URL 解決の基準になる安定 ID です。`title?` は
アプリが任意で持たせる見出し、`blocks` は本文そのものです。`meta?` には
アプリ固有のメタデータを入れます。たとえば更新日時、公開情報、外部
システムの ID などです。

Papyr では「構造化された本文」と「アプリ都合の付加情報」を分けて扱います。だから `meta` は自由ですが、本文構造は必ず `blocks` に入ります。

## 入力検証

外部 API やストレージから読んだ値は、まず `validateDocument` で non-throwing に検証できます。失敗時は field path 付きの issue を UI / CLI / server にそのまま流しやすい shape で受け取れます。

```ts
import { validateDocument } from '@f12o/papyr-core';

const result = validateDocument(JSON.parse(raw));
if (!result.success) {
  console.error(
    result.issues[0]?.pathString,
    result.issues[0]?.expected,
    result.issues[0]?.received,
  );
  throw result.error;
}

const doc = result.document;
```

throw 前提でシンプルに使いたい場面では、引き続き `parseDocument` も使えます。こちらは従来どおり Valibot の `ValiError` を投げますが、`formatDocumentValidationError(error)` を通せば `validateDocument` と同じ Papyr 向けメッセージに変換できます。
