---
kind: chapter
slug: vscode-and-editor-flow
title: VS Code と integrated editor の流れ
summary: "papyr copy 作成、custom editor、EditorWorkspace、formatter をどうつなぐか。"
emoji: 🪄
published: true
topics: [use-case, vscode, editor]
chapterOrder: 1
updatedAt: 2026-05-01T00:00:00.000Z
---

# VS Code と integrated editor の流れ

ローカル authoring の入口は `papyr-vscode-extension` です。通常の `.md` / `.markdown` に対して `Papyr: Open Active Document` または `Papyr: Create Papyr Copy` を実行すると、sibling の `.papyr.md` / `.papyr.markdown` を作って custom editor で開けます。

これで元の Markdown 運用を壊さずに、Papyr 向け block を含む file だけ段階的に増やせます。

## 1. 編集 surface は `EditorWorkspace` を使う

VS Code webview と docs site の Playground は、どちらも `@f12o/papyr-editor-ui` の `EditorWorkspace` を使っています。ここで次の責務をまとめて受け持ちます。

- Markdown source を parse / serialize する
- Markdown-visible editor を出す
- table / Mermaid / Moonlight の embedded preview と block editor を出す

UI を自前で組む前に integrated editor を入れたいなら、まず `EditorWorkspace` を埋め込むのが最短です。

## 2. schema と preview は lower layer に分かれている

`EditorWorkspace` の下では、次の package が役割を分担しています。

`@f12o/papyr-editor` は TipTap schema と `PapyrDocument` の変換を担当し、
`@f12o/papyr-markdown` は Markdown source と `PapyrDocument` の往復を、
`@f12o/papyr-preview` は read-only preview の描画を担当します。

つまり editor UI を変えたくなっても、Markdown 変換や preview を別 package のまま差し替えずに再利用できます。

## 3. source の正規化は formatter か CLI で寄せる

保存時や CI では `@f12o/papyr-markdown-formatter` の `formatMarkdown(input)` を使うと、Papyr が lossless に扱える subset だけを安定した形に揃えられます。

batch 変換や validation を shell から回したい場合は `@f12o/papyr-cli` を使います。

```sh
papyr markdown-to-json --glob "docs/**/*.papyr.md" --validate-only --id-strategy relative-path
papyr json-to-markdown --glob "papyr-json/**/*.json" --out-dir markdown
```

formatter は source を揃える用途、CLI は変換や validation を CI に入れる用途と分けると扱いやすくなります。
