import { describe, expect, it } from "vitest";
import type { PapyrDocument } from "@f12o/papyr-core";
import {
  codeBlock,
  headingBlock,
  paragraphBlock,
  tableBlock,
} from "@f12o/papyr-core";
import {
  resolvePapyrViewSettings,
  resolvePapyrSlideLayout,
  sanitizeMoonlightSvgMarkup,
  splitDocumentIntoViewSlides,
} from "./render.js";

function createDocument(partial: Partial<PapyrDocument> = {}): PapyrDocument {
  return {
    id: "doc-1",
    title: "Document One",
    blocks: [
      headingBlock({ id: "h1", level: 1, content: [{ text: "Document One" }] }),
      paragraphBlock({ id: "p1", content: [{ text: "Intro" }] }),
    ],
    ...partial,
  };
}

describe("resolvePapyrViewSettings", () => {
  it("uses document view defaults for normal documents", () => {
    expect(resolvePapyrViewSettings(createDocument())).toEqual({
      mode: "document",
      theme: "paper",
      density: "comfortable",
      layout: "article",
      titleSlide: true,
    });
  });

  it("reads optional view metadata with safe fallbacks", () => {
    expect(
      resolvePapyrViewSettings(
        createDocument({
          meta: {
            view: {
              layout: "deck",
              titleSlide: false,
              density: "dense",
            },
          },
        }),
        { theme: "ink" },
      ),
    ).toEqual({
      mode: "slides",
      theme: "ink",
      density: "dense",
      layout: "deck",
      titleSlide: false,
    });
  });
});

describe("splitDocumentIntoViewSlides", () => {
  it("uses level-2 headings as slide boundaries", () => {
    const slides = splitDocumentIntoViewSlides([
      headingBlock({ id: "h1", level: 1, content: [{ text: "Title" }] }),
      paragraphBlock({ id: "p1", content: [{ text: "Intro" }] }),
      headingBlock({ id: "h2-a", level: 2, content: [{ text: "A" }] }),
      paragraphBlock({ id: "p2", content: [{ text: "A body" }] }),
      headingBlock({ id: "h2-b", level: 2, content: [{ text: "B" }] }),
    ]);

    expect(slides).toHaveLength(3);
    expect(slides.map((slide) => slide[0]?.[1].id)).toEqual([
      "h1",
      "h2-a",
      "h2-b",
    ]);
  });
});

describe("resolvePapyrSlideLayout", () => {
  it("keeps text-only slides in the standard layout", () => {
    expect(
      resolvePapyrSlideLayout([
        headingBlock({ id: "h2", level: 2, content: [{ text: "Text" }] }),
        paragraphBlock({ id: "p1", content: [{ text: "Body" }] }),
      ]),
    ).toBe("standard");
  });

  it("uses the visual layout when embedded content is the only body content", () => {
    expect(
      resolvePapyrSlideLayout([
        headingBlock({ id: "h2", level: 2, content: [{ text: "Table" }] }),
        tableBlock({
          id: "table-1",
          columns: [{ key: "col-1", header: "Metric" }],
          rows: [[{ text: "Build" }]],
        }),
      ]),
    ).toBe("visual");
  });

  it("uses split-embedded when explanatory content sits beside an embedded block", () => {
    expect(
      resolvePapyrSlideLayout([
        headingBlock({ id: "h2", level: 2, content: [{ text: "Diagram" }] }),
        paragraphBlock({
          id: "p1",
          content: [{ text: "Read this before the table." }],
        }),
        tableBlock({
          id: "table-1",
          columns: [{ key: "col-1", header: "Metric" }],
          rows: [[{ text: "Build" }]],
        }),
      ]),
    ).toBe("split-embedded");
  });

  it("treats code as explanatory content for split embedded slides", () => {
    expect(
      resolvePapyrSlideLayout([
        codeBlock({ id: "code-1", language: "ts", source: "const ok = true;" }),
        tableBlock({
          id: "table-1",
          columns: [{ key: "col-1", header: "Metric" }],
          rows: [[{ text: "Build" }]],
        }),
      ]),
    ).toBe("split-embedded");
  });
});

describe("sanitizeMoonlightSvgMarkup", () => {
  it("keeps SVG markup and strips unsafe script/event content", () => {
    const result = sanitizeMoonlightSvgMarkup(
      '<svg viewBox="0 0 120 80"><script>alert(1)</script><foreignObject><iframe src="https://example.com"></iframe></foreignObject><use href="data:image/svg+xml;base64,AA==" /><rect onclick="bad()" width="120" height="80" /><image href="https://example.com/pixel.png" /><image href="data:image/png;base64,AA==" /></svg>',
    );

    expect(result.status).toBe("ok");
    if (result.status !== "ok") throw new Error("expected sanitized svg");
    expect(result.markup).toContain("<svg");
    expect(result.markup).toContain("<rect");
    expect(result.markup).toContain('href="data:image/png;base64,AA=="');
    expect(result.markup).not.toContain("<script");
    expect(result.markup).not.toContain("<foreignObject");
    expect(result.markup).not.toContain("<iframe");
    expect(result.markup).not.toContain("<use");
    expect(result.markup).not.toContain("https://example.com");
    expect(result.markup).not.toContain("onclick");
  });

  it("returns explicit states for missing or invalid SVG", () => {
    expect(sanitizeMoonlightSvgMarkup("")).toEqual({ status: "empty" });
    expect(sanitizeMoonlightSvgMarkup("<div>not svg</div>")).toEqual({
      status: "invalid",
    });
  });
});
