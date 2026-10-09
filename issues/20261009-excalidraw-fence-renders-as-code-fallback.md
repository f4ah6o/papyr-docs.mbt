# Excalidraw fence renders as code fallback instead of SVG

- Status: open
- Created: 2026-10-09
- Author: devin (ported finding)
- Source: E2E verification of `content/articles/2026-05-07-excalidraw-review-flow.md` (ported from `f4ah6o/papyr.mbt` PR #39)
- Related: `packages/markdown/src/fences.ts`, `packages/preview/src/render.ts`

## Problem

The `papyr-excalidraw` fenced block renders as a plain `<pre><code>`
fallback showing raw JSON on the docs site, while the article prose claims
the preview renders Excalidraw blocks as SVG.

Root cause (verified against built output
`dist/content/r2/docs/article-excalidraw-review-flow.json`):

- `packages/markdown/src/fences.ts` only special-cases `papyr-table` and
  `papyr-moonlight`; the `papyr-excalidraw` fence degrades to a generic
  `["Code", {language:"papyr-excalidraw"}]` node.
- `packages/preview/src/render.ts` has no `Excalidraw` case — only
  Mermaid and Moonlight get structured/SVG rendering.
- `src/markdown/parse.mbt` does define `Block::Excalidraw`, but the docs
  site build uses the TypeScript parser, so that variant never reaches
  the renderer.

## Options

- Reword article prose to describe the code fallback (content fix), or
- Implement `papyr-excalidraw` handling in `fences.ts` + `render.ts`
  (feature gap — likely an upstream `papyr.mbt` decision since it owns
  the package sources).
