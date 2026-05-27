---
kind: chapter
slug: publication-api
title: publication API と SPA ルート
summary: demo-cloudflare が持つ route と seed API の役割。
emoji: 🌐
published: true
topics: [cloudflare, api]
chapterOrder: 1
updatedAt: 2026-04-25T00:00:00.000Z
---

# publication API と SPA ルート

`@f12o/papyr-demo-cloudflare` は `meta.publication` を使って article / book / chapter を表現し、次の route を持ちます。

- `/`, `/articles`, `/articles/:slug`
- `/books`, `/books/:slug`, `/books/:slug/:chapterSlug`
- `/studio`

API は `GET|PUT|DELETE /api/documents/:id` に加えて、publication 用に `GET /api/publications`, `GET|PUT|DELETE /api/publications/:id`, `GET /api/books/:bookId`, `POST /api/seed/demo-content` を持ちます。

seed endpoint は空の KV 環境へ demo article / book / chapter を投入する用途です。public pages と studio が同居しているので、PapyrDocument を「公開コンテンツ」と「編集 UI」の両方から触る構成を一つの Worker で確認できます。
