---
kind: book
slug: markdown-formatter
title: '@f12o/papyr-markdown-formatter'
summary: Papyr が表現できる Markdown subset を parse -> serialize で正規化する formatter。
emoji: ✨
published: true
topics: [markdown, formatter]
updatedAt: 2026-04-25T00:00:00.000Z
---

# @f12o/papyr-markdown-formatter

`@f12o/papyr-markdown-formatter` は、Papyr が lossless に扱える Markdown subset だけを対象にした小さな formatter です。Markdown parser と serializer をそのまま使って、**PapyrDocument に一度落とせる Markdown だけを安定した形に揃える** 役割を持ちます。

Prettier のような汎用 formatter と違って、表・Mermaid・Excalidraw を含む Papyr 独自 block を前提にしているのが特徴です。editor の保存フック、CI の正規化、CLI 前処理に向いています。
