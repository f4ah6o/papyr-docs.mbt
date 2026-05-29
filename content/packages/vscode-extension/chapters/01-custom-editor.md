---
kind: chapter
slug: custom-editor
title: Custom editor の構成
summary: VS Code 上で Markdown / preview / Mermaid / Moonlight を同期する。
emoji: 🪟
published: true
topics: [vscode, mermaid, moonlight]
chapterOrder: 1
updatedAt: 2026-04-25T00:00:00.000Z
---

# Custom editor の構成

拡張は `papyr.markdownEditor` という custom editor provider を登録し、`papyr.md` / `papyr.markdown` / `*.papyr.md` / `*.papyr.markdown` を自動で custom editor に割り当てます。`Papyr: Open Active Document` は、Papyr 対象ならそのまま開き、通常の `.md` / `.markdown` なら sibling の Papyr copy を作って開きます。

webview 側では次の 3 つを同時に表示します。

- Markdown textarea
- `renderDocumentPreview` による preview
- Mermaid / Moonlight block の inspector

Markdown は `parseMarkdown` / `serializeDocument` で `PapyrDocument` と相互変換し、diagram 追加や更新は `@f12o/papyr-editor` の helper で block を直接編集します。つまり extension は「VS Code に閉じた独自 format」を持たず、**常に PapyrDocument を中間表現にする** ことで preview や他 package と整合を取っています。
