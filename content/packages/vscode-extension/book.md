---
kind: book
slug: vscode-extension
title: papyr-vscode-extension
summary: Papyr Markdown を custom editor で開く VS Code extension。
emoji: 🧰
published: true
topics: [vscode, editor]
updatedAt: 2026-04-26T00:00:00.000Z
---

# papyr-vscode-extension

`papyr-vscode-extension` は、`papyr.md` / `papyr.markdown` / `*.papyr.md` / `*.papyr.markdown` を VS Code の custom editor で開く extension です。通常の `.md` / `.markdown` からも Papyr copy を作って editor に入れるので、ファイルベースの Markdown 運用から段階的に移行できます。Markdown テキスト、table / Mermaid / Moonlight の embedded preview、block editor を同時に扱えるので、Papyr の編集体験をそのままローカルファイルに持ち込めます。

内部では `@f12o/papyr-editor`、`@f12o/papyr-editor-ui`、`@f12o/papyr-markdown`、`@f12o/papyr-preview` を組み合わせていて、Papyr package 群をどう組み合わせるかの実例にもなっています。
