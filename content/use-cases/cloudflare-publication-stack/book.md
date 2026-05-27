---
kind: book
slug: cloudflare-publication-stack
title: 'Cloudflare で Papyr の公開サイトを組み立てる'
summary: 'Workers と Cloudflare storage を使って、PapyrDocument の公開導線を組む use case。'
emoji: ☁️
published: true
topics: [use-case, cloudflare, backend, publishing]
updatedAt: 2026-05-01T00:00:00.000Z
---

# Cloudflare で Papyr の公開サイトを組み立てる

この use case は、Papyr の公開物を Cloudflare 上へ寄せたい場合に、**Worker の route、保存先 adapter、publication data の流れ** をどう分けるかを見るための入口です。

公開 API と studio を同じ Worker に載せるパターンも、build 済み JSON を object storage から配るパターンも、どちらも `BackendAdapter` 契約の上で組み立てられます。

## この use case で見ること

1. `BackendAdapter` を前提に保存先を差し替える考え方
2. Cloudflare KV / D1 / R2 をどう選ぶか
3. `@f12o/papyr-demo-cloudflare` が持つ route と seed API の役割

## 先に辿るリンク

- [Worker ルートと保存先の選び方を見る](/books/cloudflare-publication-stack/worker-routes-and-storage)
- [Cloudflare demo を見る](/books/demo-cloudflare)
- [Papyr の公式 docs site を見る](/books/papyr-docs)

## 関連する docs

- [@f12o/papyr-backend を見る](/books/backend)
- [@f12o/papyr-adapter-cloudflare を見る](/books/adapter-cloudflare)
- [@f12o/papyr-search を見る](/books/search)
