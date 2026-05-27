---
kind: chapter
slug: local-json
title: createFsAdapter
summary: createFsAdapter で JSON ファイルを保存先にする。
emoji: 📁
published: true
topics: [fs, local]
chapterOrder: 1
updatedAt: 2026-04-25T00:00:00.000Z
---

# createFsAdapter

```ts
import { createFsAdapter } from '@f12o/papyr-adapter-fs';

const adapter = createFsAdapter({
  dir: './data/papyr',
});
```

`createFsAdapter` は `dir` 配下に document ごとの JSON ファイルを作ります。保存ファイル名は `encodeURIComponent(id)` ベースなので、PapyrDocument の ID をそのまま扱えます。

## 振る舞い

`put(doc)` は `dir` を自動作成して `<id>.json` を書き込みます。`get(id)` は
ファイルがなければ `null` を返します。`list()` は `*.json` だけを読み、
必要なら `limit` で先頭件数を切ります。`delete(id)` は対応 JSON を削除します。

複雑な query や並行更新制御は持たないので、本番 storage というより
ローカル開発の基準実装と考えるのが自然です。adapter interface の最小例として
読むのにも向いています。
