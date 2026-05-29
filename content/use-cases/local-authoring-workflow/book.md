---
kind: book
slug: local-authoring-workflow
title: "ローカル Markdown 運用から Papyr 編集体験へ"
summary: "既存の Markdown ファイル運用を崩さずに、VS Code custom editor と formatter を足して Papyr の編集体験へ段階的に寄せる use case。"
emoji: 🧑‍💻
published: true
topics: [use-case, authoring, vscode, editor]
updatedAt: 2026-05-01T00:00:00.000Z
---

# ローカル Markdown 運用から Papyr 編集体験へ

この use case は、すでに git 管理している Markdown リポジトリを前提に、**保存形式は Markdown のまま、編集体験だけ Papyr に寄せる** 流れをまとめたものです。

`.md` をいきなり別 CMS へ移すのではなく、VS Code 上で `.papyr.md` を併用しながら table / Mermaid / Moonlight を扱えるようにします。

## この use case で見ること

1. 通常の `.md` から `.papyr.md` を作って custom editor へ入る流れ
2. `EditorWorkspace` を使って Playground と同じ integrated editor を組み込む方法
3. `formatMarkdown` や `papyr` CLI を使って source を揃える場所

## 先に辿るリンク

- [VS Code と integrated editor の流れを見る](/books/local-authoring-workflow/vscode-and-editor-flow)
- [Playground を開く](/playground)
- [papyr-vscode-extension を見る](/books/vscode-extension)

## 関連する docs

- [@f12o/papyr-editor-ui を見る](/books/editor-ui)
- [@f12o/papyr-editor を見る](/books/editor)
- [@f12o/papyr-markdown-formatter を見る](/books/markdown-formatter)
- [@f12o/papyr-cli を見る](/books/cli)
