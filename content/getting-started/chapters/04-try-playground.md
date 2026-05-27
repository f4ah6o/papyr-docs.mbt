---
kind: chapter
slug: try-playground
title: Playground を試す
summary: local-only の Playground で visual editor と block preview を触る。
emoji: 🎮
published: true
topics: [playground, editor]
chapterOrder: 4
updatedAt: 2026-05-01T00:00:00.000Z
---

# Playground を試す

実装に入る前に編集体験を先に見たいなら、[/playground](/playground) が最短です。ここでは `@f12o/papyr-editor-ui` の `EditorWorkspace` を使い、visual editor と Markdown source の同期、block preview を一緒に確認できます。

## まず触ってみるポイント

1. 見出しやリストを編集して、Markdown source に serialize されることを見る
2. table / Mermaid / Excalidraw block をダブルクリックして focused editor を開く
3. `Copy Markdown` で現在の source を持ち出し、自分の app に貼り戻す

Playground の内容は browser の `localStorage` にだけ保存され、server / Worker API には送られません。保存先の設計を決める前に UI の感触だけを試せるのが利点です。

## Playground のあとに進む先

埋め込み方を見るなら [@f12o/papyr-editor-ui](/books/editor-ui)、
1 画面構成の例を見るなら
[統合エディタで Markdown・preview・diagram を 1 画面に](/articles/integrated-editor)、
保存先まで含めて組み込むなら
[backend につなぐ](/books/getting-started/connect-backend) を読むと流れが
つながります。
