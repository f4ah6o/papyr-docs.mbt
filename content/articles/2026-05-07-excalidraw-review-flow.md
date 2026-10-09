---
kind: article
slug: excalidraw-review-flow
title: 'Excalidraw で docs のレビュー導線を Markdown に残す'
summary: 'Papyr の docs site と同じ構成で、レビュー導線や公開フローを Excalidraw block と Markdown を混ぜて残すやり方。'
emoji: 🗺️
published: true
topics: [excalidraw, docs, review, workflow]
updatedAt: 2026-05-07T00:00:00.000Z
---

# Excalidraw で docs のレビュー導線を Markdown に残す

Papyr の docs site では、本文は Markdown のまま git で管理しつつ、公開時には `PapyrDocument` JSON に変換して preview / search / raw markdown 配信に使っています。テキストだけだとレビュー時に共有しづらい「どこで確認して、どこへ戻すか」を残したいときに、`papyr-excalidraw` block がちょうど噛み合います。

このページでは、**公式 docs site 自体の更新フロー**を題材に、Markdown と Excalidraw を 1 つの原稿にまとめる例を置いておきます。

## レビュー導線を 1 枚で置く

下の block は、記事を書いてから preview と deploy へつなぐ最小の流れです。本文では手順を文章で書き、判断の分岐や戻り先だけを Excalidraw に寄せます。

```papyr-excalidraw
{
  "caption": "Papyr docs review flow",
  "elements": [
    {
      "type": "rectangle",
      "x": 24,
      "y": 24,
      "width": 200,
      "height": 84,
      "strokeColor": "#1f6f5f",
      "backgroundColor": "#eef9f6",
      "strokeWidth": 2
    },
    {
      "type": "text",
      "x": 58,
      "y": 54,
      "text": "Markdown source",
      "strokeColor": "#1f2629",
      "fontSize": 24
    },
    {
      "type": "arrow",
      "x": 236,
      "y": 66,
      "width": 132,
      "height": 0,
      "strokeColor": "#8b5e34",
      "backgroundColor": "transparent",
      "strokeWidth": 2,
      "points": [[0, 0], [132, 0]]
    },
    {
      "type": "rectangle",
      "x": 382,
      "y": 24,
      "width": 220,
      "height": 84,
      "strokeColor": "#8b5e34",
      "backgroundColor": "#fff5eb",
      "strokeWidth": 2
    },
    {
      "type": "text",
      "x": 430,
      "y": 54,
      "text": "Preview / review",
      "strokeColor": "#1f2629",
      "fontSize": 24
    },
    {
      "type": "arrow",
      "x": 614,
      "y": 66,
      "width": 136,
      "height": 0,
      "strokeColor": "#7a4ee6",
      "backgroundColor": "transparent",
      "strokeWidth": 2,
      "points": [[0, 0], [136, 0]]
    },
    {
      "type": "rectangle",
      "x": 764,
      "y": 24,
      "width": 220,
      "height": 84,
      "strokeColor": "#7a4ee6",
      "backgroundColor": "#f5f0ff",
      "strokeWidth": 2
    },
    {
      "type": "text",
      "x": 816,
      "y": 54,
      "text": "Worker + R2",
      "strokeColor": "#1f2629",
      "fontSize": 24
    },
    {
      "type": "arrow",
      "x": 490,
      "y": 124,
      "width": -260,
      "height": 84,
      "strokeColor": "#d9485f",
      "backgroundColor": "transparent",
      "strokeWidth": 2,
      "points": [[0, 0], [-260, 84]]
    },
    {
      "type": "text",
      "x": 244,
      "y": 186,
      "text": "fix comments in Markdown",
      "strokeColor": "#d9485f",
      "fontSize": 20
    }
  ],
  "appState": {
    "viewBackgroundColor": "#ffffff"
  }
}
```

このくらいの粒度なら、別ファイルの図を添付するより Markdown の隣に置いた方が更新しやすくなります。特に docs review では、図そのものよりも「文章・CLI・公開経路の関係を同じ commit で見直せる」ことの方が重要です。

## Papyr の文脈で使うと何が良いか

1. 原稿の source は Markdown のままなので、通常の diff と code review に乗せられる
2. preview 側では Excalidraw block が SVG として描画されるので、画像書き出しを別途持たなくてよい
3. `raw markdown` 配信でも `papyr-excalidraw` fence がそのまま残るので、LLM や別ツールへ渡すときも情報を欠きにくい

Mermaid と違って厳密な graph 記法に落としきれないとき、レビューの補助線だけ Excalidraw に逃がせるのが便利です。仕様メモ、画面遷移の赤入れ、公開チェックの戻り先など、**文章にはしたいが、表やフローチャートにはしづらい情報**に向いています。

## どこで編集するか

Papyr の integrated editor を使う場合は [`EditorWorkspace`](/books/editor-ui/editor-workspace) から入るのが最短です。Markdown-visible editor のまま Excalidraw block を開いて修正できるので、図だけ別ツールへ往復する必要がありません。

- docs site の構成を知りたいときは [このサイトの仕組み](/books/official-docs-site/how-this-site-works)
- fence の書式を確認したいときは [特殊フェンス](/books/markdown/fences)
- 触って試したいときは [Playground](/playground)
