# papyr-docs.mbt

Papyr の紹介 web site 兼 dogfooding project です。

この repository は Papyr 自身の documentation site、playground、
Cloudflare Workers deployment を運用します。現在の docs UI が使う Papyr
preview API は npm 公開版にまだ追いついていないため、移行直後は
`packages/*` を同梱して local workspace として解決します。Papyr 本体の
MoonBit / npm package 実装は
[`f4ah6o/papyr.mbt`](https://github.com/f4ah6o/papyr.mbt) が所有します。

## Quick Start

```sh
pnpm install --frozen-lockfile
just build
```

local development server:

```sh
just dev
```

## Commands

```sh
just typecheck
just test
just build
just e2e
```

deploy:

```sh
just deploy-preview
just deploy-production
```

Cloudflare secrets are injected from the configured 1Password environment item.
Do not print secret values; use runtime injection through `opz` / 1Password.

## Repository Shape

- `content/`: Papyr documents written as Markdown.
- `src/client/`: React client, playgrounds, prerendered page shell.
- `src/worker.ts`: Cloudflare Worker runtime.
- `scripts/`: content build, prerender, R2 upload, and deploy helpers.
- `e2e/`: Playwright coverage for the published site behavior.

The content pipeline currently uses the local TypeScript fallback projection.
The `BuildBridge` interface remains in place so a future Papyr WASM or CLI
projection backend can replace it without changing content ingestion.
Once the Papyr packages used by this app are published, the local `packages/*`
workspace can be replaced by exact `@f12o/papyr-*` npm dependencies.
