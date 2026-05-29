---
kind: book
slug: editor-ui
title: "@f12o/papyr-editor-ui"
summary: Papyr の visual React editor workspace を提供する UI package。
emoji: 🪟
published: true
topics: [editor, react, ui]
updatedAt: 2026-04-26T00:00:00.000Z
---

# @f12o/papyr-editor-ui

`@f12o/papyr-editor-ui` は、docs site の `/playground` と VS Code extension webview で共有している
React UI package です。`@f12o/papyr-editor` の headless schema / converter、`@f12o/papyr-markdown` の
source 変換、`@f12o/papyr-preview` の描画をまとめて、visual editor と table / Mermaid /
Moonlight の embedded preview + block editor を 1 つの workspace に載せます。

UI を自前で組む前に「まず Papyr の編集体験を動かしたい」ときの近道で、`EditorWorkspace` と
sample document helper を export しています。

## 最小コード

```tsx
import { useState } from "react";
import {
  createSampleDocumentSource,
  EditorWorkspace,
} from "@f12o/papyr-editor-ui";

export function App() {
  const [source, setSource] = useState(() => createSampleDocumentSource());

  return (
    <EditorWorkspace
      source={source}
      onSourceChange={setSource}
      documentId="editor-demo"
      title="Papyr editor"
    />
  );
}
```

`source` は Markdown 文字列です。UI の外側では通常の React state として持ち、保存時に backend adapter や file API へ渡します。
