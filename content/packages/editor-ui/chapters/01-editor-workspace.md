---
kind: chapter
slug: editor-workspace
title: EditorWorkspace
summary: EditorWorkspace と createSampleDocumentSource で visual editor と embedded preview を埋め込む。
emoji: 🧱
published: true
topics: [react, workspace]
chapterOrder: 1
updatedAt: 2026-04-26T00:00:00.000Z
---

# EditorWorkspace

`EditorWorkspace` は Markdown source と visual editor をつなぐ React component です。

## 最小コード

```tsx
import { useState } from "react";
import { EditorWorkspace } from "@f12o/papyr-editor-ui";

export function PapyrEditor(): JSX.Element {
  const [source, setSource] = useState("# Papyr\n");

  return (
    <EditorWorkspace
      source={source}
      onSourceChange={setSource}
      documentId="papyr-editor-demo"
    />
  );
}
```

## workspace の責務

`EditorWorkspace` は 3 つの責務をまとめて持ちます。

1. Markdown source を `PapyrDocument` に parse / serialize する
2. visual editor 上で見出しや強調を編集し、変更を Markdown source へ serialize する
3. table / Mermaid / Moonlight の embedded preview と block editor を同じ workspace に載せる

## sample source

`createSampleDocumentSource()` は Markdown・table・Mermaid・Moonlight を含む serialized source を返します。

playground や story 的な画面で、空状態ではなく「Papyr らしい document」を最初から見せたいときに向いています。

## props の要点

`source` と `onSourceChange` は外側で source を保持するための必須 props
です。`documentId` は parse 時の document ID で、省略時は fallback ID
を使います。

## 操作を制御する props

`readOnly` は editor と embedded block 操作を止めたいときに使います。`editorModes` は互換性のために残っている deprecated prop で、現在は integrated Markdown surface に固定です。

`initialSelectedDiagramId` と `onSelectedDiagramIdChange` は、embedded block
の選択状態を外で保持したいときのフックです。

## 依存関係

`react` / `react-dom` / `@f12o/papyr-moonlight` は peer dependency です。UI package 自体は
`@f12o/papyr-editor` / `@f12o/papyr-markdown` / `@f12o/papyr-preview` の上に載っているので、必要になれば
後から headless layer へ降りて独自 UI を組むこともできます。
