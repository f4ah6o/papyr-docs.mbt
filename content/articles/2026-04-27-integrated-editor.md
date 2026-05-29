---
kind: article
slug: integrated-editor
title: "統合エディタで Markdown・preview・diagram を 1 画面に"
summary: "@f12o/papyr-editor-ui の EditorWorkspace を使うと、Markdown editor、embedded block preview、diagram editor を 1 つの workspace に収められます。"
emoji: ✍️
published: true
topics: [editor, react, ui]
updatedAt: 2026-04-28T00:00:00.000Z
---

# 統合エディタで Markdown・preview・diagram を 1 画面に

Papyr の編集レイヤーは 2 段構成になっています。

`@f12o/papyr-editor` は TipTap ベースの headless schema と
`PapyrDocument` の変換層です。`@f12o/papyr-editor-ui` はその上に載る
React UI package で、`EditorWorkspace` を提供します。

まず全体像を掴みたいなら、[`EditorWorkspace`](/books/editor-ui/editor-workspace) から始めるのが最短です。

## EditorWorkspace の埋め込み

```tsx
import { useState } from "react";
import { EditorWorkspace } from "@f12o/papyr-editor-ui";

export function MyEditor() {
  const [source, setSource] = useState("# Hello Papyr\n");

  return (
    <EditorWorkspace
      source={source}
      onSourceChange={setSource}
      documentId="my-doc"
    />
  );
}
```

`source` と `onSourceChange` だけで、外側の React state と workspace をつなげます。

## sample source を使う

`createSampleDocumentSource()` は Markdown・table・Mermaid・Moonlight を含む sample source を返します。

空の editor ではなく、Papyr らしい document をすぐ見せたい画面に向いています。

## 保存先へつなぐ

`source` / `onSourceChange` で外側の state と繋ぎます。

保存時だけ `PapyrDocument` に変換します。

## 保存処理の例

```tsx
import { parseMarkdown } from "@f12o/papyr-markdown";

async function saveSource(newSource: string) {
  const doc = parseMarkdown(newSource, { documentId: "my-doc" });
  await saveDocument(doc);
}
```

この関数を `onSourceChange` から呼ぶと、UI と保存処理を分けて扱えます。

## adapter に任せる

永続化の層は [`@f12o/papyr-backend`](/books/backend) の interface に揃えます。

ローカルなら [`@f12o/papyr-adapter-fs`](/books/adapter-fs/local-json) をそのまま使えます。

`EditorWorkspace` 自体は storage を知りません。保存先の差し替えは adapter 側だけで完結します。

## workspace でできること

| 要素                       | 内容                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Integrated Markdown editor | Markdown source を直接編集する                                                                          |
| Embedded block preview     | table / Mermaid / Moonlight block を同じ workspace 内で preview できる                                                   |
| Block editor modal         | preview card を double click / double tap すると Mermaid・table・Moonlight 専用 editor が開く                            |

## 状態管理 hooks

`readOnly` は Markdown 編集と embedded block 操作を止めたいときに使います。

`initialSelectedDiagramId` と `onSelectedDiagramIdChange` は block 選択状態を
外で保持したいときのフックです。

## workspace の表示補助

`eyebrow`、`subtitle`、`banner` は top bar の文言や補助 UI を差し込みたいときに使います。

## headless layer に降りる場合

このレイアウトが合わない場合は、`@f12o/papyr-editor` の converter と TipTap の `Editor` を直接組み合わせて UI を組めます。`@f12o/papyr-editor-ui` は headless layer の上に載る参照実装なので、必要になった段階で段階的に分解できます。
