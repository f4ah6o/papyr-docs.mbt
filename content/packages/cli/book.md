---
kind: book
slug: cli
title: '@f12o/papyr-cli'
summary: Markdown と Papyr JSON を相互変換する Node.js CLI。
emoji: 🛠️
published: true
topics: [cli, markdown]
updatedAt: 2026-04-25T00:00:00.000Z
---

# @f12o/papyr-cli

`@f12o/papyr-cli` は `papyr` コマンドを提供し、Markdown と `PapyrDocument` JSON を相互変換できます。Node.js script から library を直接呼ぶ前に、まず terminal で round-trip を確かめたいときに便利です。

標準入出力にも対応しているので、CI や他ツールとの pipe でも扱えます。
