# Slide readability lint follow-ups

- Status: open
- Created: 2026-05-30
- Author: codex
- Source: `lint-slides` run against `papyr-docs.mbt` `origin/main`
- Related: `papyr.mbt` `issues/20260529T220555Z-core-moonlight-json-decode-parity-for-slide-lint.md`

## Problem

`papyr.mbt` now provides `lint-slides` and `lint-slides-json` for slide
readability checks. Running the new CLI against this docs corpus found no
Crater fit failures, but it did find slides that are harder to read because
they carry too much text, code, table, or visual content.

The `lint-slides-json` pass also found two Moonlight JSON decode failures. That
is tracked in `papyr.mbt` because the docs Markdown source can be linted
successfully, while the generated JSON shape currently contains a `Moonlight`
block constructor unknown to the MoonBit decoder.

## Latest Run

- Target repo state: `papyr-docs.mbt` `origin/main` at `355e1e6`
- CLI repo state: `papyr.mbt` `origin/main` at merge commit `819e1ea`
- Viewport: `1280x720`
- Markdown input: `content/**/*.md`
- JSON input: `dist/content/documents.json` after `pnpm run build:content`

### Markdown lint summary

- Documents: 57
- Slides: 162
- Warnings: 72
- Errors: 0
- Command failures: 0
- Crater low-fit failures: 0

Warning breakdown:

- `too_much_text`: 42
- `code_too_large`: 16
- `code_line_too_long`: 6
- `visual_overload`: 4
- `table_too_tall`: 2
- `long_sentence`: 1
- `too_many_blocks`: 1

### JSON lint summary

- Documents: 57
- Slides: 155
- Warnings: 49
- Errors: 0
- Command failures: 2
- Crater low-fit failures: 0

The two command failures are:

- `article-moonlight-authoring-sample`
- `chapter-markdown-fences`

Both fail with `Unknown enum constructor Moonlight when deserializing Block`.

## Priority Fixes

Start with the documents that have the largest warning count or that are visible
in current slide-view review.

- `content/packages/core/book.md`: 11 warnings. Split dense overview slides such
  as `PapyrDocument の形`, `block 種別`, and `JSON の例`; shorten large code
  examples.
- `content/articles/2026-04-27-integrated-editor.md`: 5 warnings. Split
  `EditorWorkspace の埋め込み` and `保存先へつなぐ`; keep code snippets below 14
  lines per slide.
- `content/articles/2026-04-27-markdown-formatter-ci.md`: 3 warnings. Split `CI
  での使い方` into explanation and command/config examples.
- `content/articles/2026-05-09-moonlight-authoring-sample.md`: 2 warnings. The
  first slide has 660 text units and a 1884-character code line; use a short
  Moonlight excerpt and move the full payload elsewhere.
- `content/packages/editor-ui/chapters/01-editor-workspace.md`: 2 warnings.
  Split prose and the sample code so the slide remains readable in `1280x720`.

## Required Tests

Do not close this issue with only manual visual checks.

- Run `pnpm run build:content` after content edits.
- Run `pnpm run lint:slides` so the browser-level slide fit test still passes.
- Re-run `papyr.mbt` native `lint-slides --viewport 1280x720` over
  `content/**/*.md` and record the before/after warning count in the resolution.
- After the `papyr.mbt` Moonlight JSON decoder issue is fixed, also re-run
  `lint-slides-json --viewport 1280x720` against `dist/content/documents.json`
  and confirm the two Moonlight documents no longer fail to decode.

## Acceptance Criteria

- The high-priority documents above have either no slide readability warnings or
  an explicit reason in this issue for any warning intentionally left.
- `pnpm run build:content` passes.
- `pnpm run lint:slides` passes.
- The final resolution records the updated `lint-slides` warning count and the
  remaining warning categories.
