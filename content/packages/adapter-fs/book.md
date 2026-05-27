---
kind: book
slug: adapter-fs
title: '@f12o/papyr-adapter-fs'
summary: PapyrDocument をローカル JSON ファイルへ保存する BackendAdapter。
emoji: 💾
published: true
topics: [backend, fs]
updatedAt: 2026-04-25T00:00:00.000Z
---

# @f12o/papyr-adapter-fs

`@f12o/papyr-adapter-fs` は、`BackendAdapter` を最小コストで試せるローカル向け実装です。各 document を `dir/<encoded-id>.json` として保存するだけなので、Node.js script、ローカルツール、PoC に向いています。

database を入れる前の開発段階で「PapyrDocument をまず永続化したい」ときの基準点になります。

## 最小コード

```ts
import { createFsAdapter } from '@f12o/papyr-adapter-fs';
import { parseMarkdown } from '@f12o/papyr-markdown';

const adapter = createFsAdapter({ dir: './.papyr-docs' });
const doc = parseMarkdown('# Local draft\n\nJSON ファイルへ保存します。', {
  documentId: 'local-draft',
});

await adapter.put(doc);
console.log(await adapter.get('local-draft'));
```

ローカル script や CLI の検証では、まずこの adapter で `BackendAdapter` の呼び出し形を固めると、あとで Cloudflare や業務アプリ向け adapter に差し替えやすくなります。
