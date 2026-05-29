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
import {
  EditorWorkspace,
  createSampleDocumentSource,
} from "@f12o/papyr-editor-ui";
import "@f12o/papyr-editor-ui/styles.css";

export function MyEditor(): JSX.Element {
  const [source, setSource] = useState(() => createSampleDocumentSource());

  return (
    <EditorWorkspace
      source={source}
      onSourceChange={setSource}
      documentId="my-doc"
      title="My Papyr Editor"
    />
  );
}
```

`createSampleDocumentSource()` は Markdown・table・Mermaid・Moonlight を含む sample source を返します。空の editor ではなく、Papyr らしい document をすぐ見せたい画面に向いています。

## 保存先へつなぐ

`source` / `onSourceChange` で外側の state と繋ぎ、保存時だけ `PapyrDocument` に変換して adapter へ渡します。永続化の層は [`@f12o/papyr-backend`](/books/backend) の interface に揃え、ローカルなら [`@f12o/papyr-adapter-fs`](/books/adapter-fs/local-json) をそのまま使えます。

```tsx
import { useState } from "react";
import { createFsAdapter } from "@f12o/papyr-adapter-fs";
import { EditorWorkspace } from "@f12o/papyr-editor-ui";
import { parseMarkdown } from "@f12o/papyr-markdown";

const adapter = createFsAdapter({ dir: "./data/papyr" });

export function PersistentEditor(): JSX.Element {
  const [source, setSource] = useState("# Hello Papyr\n");

  async function handleSourceChange(newSource: string) {
    setSource(newSource);

    const doc = parseMarkdown(newSource, { documentId: "my-doc" });
    await adapter.put(doc);
  }

  return (
    <EditorWorkspace
      source={source}
      onSourceChange={handleSourceChange}
      documentId="my-doc"
    />
  );
}
```

`EditorWorkspace` 自体は storage を知りません。保存先を file / kintone / Cloudflare などに差し替えたいときも、adapter 側だけで完結します。

## workspace でできること

| 要素                       | 内容                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Integrated Markdown editor | Markdown 記号を残したまま編集する canonical source。style palette は hidden rich text ではなく Markdown を直接書き換える |
| Embedded block preview     | table / Mermaid / Moonlight block を同じ workspace 内で preview できる                                                   |
| Block editor modal         | preview card を double click / double tap すると Mermaid・table・Moonlight 専用 editor が開く                            |

`readOnly` は Markdown 編集と embedded block 操作を止めたいときに使います。
`initialSelectedDiagramId` と `onSelectedDiagramIdChange` は block 選択状態を
外で保持したいときのフックです。`eyebrow`、`subtitle`、`banner` は
top bar の文言や補助 UI を差し込みたいときに使います。

## headless layer に降りる場合

このレイアウトが合わない場合は、`@f12o/papyr-editor` の converter と TipTap の `Editor` を直接組み合わせて UI を組めます。`@f12o/papyr-editor-ui` は headless layer の上に載る参照実装なので、必要になった段階で段階的に分解できます。
