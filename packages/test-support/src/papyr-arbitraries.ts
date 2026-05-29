import fc from "fast-check";
import type {
  Block,
  CodeBlock,
  MoonlightBlock,
  HeadingBlock,
  Inline,
  ListBlock,
  ListItem,
  MermaidBlock,
  PapyrDocument,
  ParagraphBlock,
  TableBlock,
} from "@f12o/papyr-core";

type Mark = NonNullable<Inline["marks"]>[number];
type SingleInlineRunOption = {
  singleInlineRun?: boolean;
};

const MARK_ORDER: Mark[] = ["bold", "italic", "code", "strike", "link"];
const WORDS = [
  "papyr",
  "alpha",
  "beta",
  "gamma",
  "delta",
  "guide",
  "docs",
  "table",
  "list",
  "search",
  "editor",
  "markdown",
  "diagram",
  "cloud",
  "kintone",
  "42",
  "東京",
  "資料",
];

function paragraphBlock(payload: ParagraphBlock[1]): ParagraphBlock {
  return ["Paragraph", payload];
}

function headingBlock(payload: HeadingBlock[1]): HeadingBlock {
  return ["Heading", payload];
}

function listBlock(payload: ListBlock[1]): ListBlock {
  return ["List", payload];
}

function codeBlock(payload: CodeBlock[1]): CodeBlock {
  return ["Code", payload];
}

function tableBlock(payload: TableBlock[1]): TableBlock {
  return ["Table", payload];
}

function mermaidBlock(payload: MermaidBlock[1]): MermaidBlock {
  return ["Mermaid", payload];
}

function moonlightBlock(payload: MoonlightBlock[1]): MoonlightBlock {
  return ["Moonlight", payload];
}

function isListBlock(block: Block | undefined): block is ListBlock {
  return block?.[0] === "List";
}

export const safeTextArbitrary = fc
  .array(fc.constantFrom(...WORDS), { minLength: 1, maxLength: 4 })
  .map((parts) => parts.join(" "));

const urlArbitrary = fc
  .array(
    fc.constantFrom("docs", "guide", "api", "search", "editor", "markdown"),
    {
      minLength: 1,
      maxLength: 3,
    },
  )
  .map((parts) => `https://example.com/${parts.join("/")}`);

const inlineArbitrary: fc.Arbitrary<Inline> = fc
  .tuple(
    safeTextArbitrary,
    fc.uniqueArray(fc.constantFrom<Mark>(...MARK_ORDER), {
      maxLength: MARK_ORDER.length,
    }),
    fc.option(urlArbitrary, { nil: undefined }),
  )
  .map(([text, marks, href]) => {
    const normalizedMarks = normalizeMarks(marks);
    const roundTrippableMarks: Mark[] = normalizedMarks.includes("code")
      ? ["code"]
      : normalizedMarks;
    const normalizedHref = roundTrippableMarks.includes("link")
      ? (href ?? "https://example.com/docs")
      : undefined;
    return {
      text,
      ...(roundTrippableMarks.length > 0 && { marks: roundTrippableMarks }),
      ...(normalizedHref !== undefined && { href: normalizedHref }),
    };
  });

function paragraphBlockArbitrary(
  options: SingleInlineRunOption,
): fc.Arbitrary<Block> {
  return fc
    .record({
      id: fc.constant("temp"),
      content: fc.array(inlineArbitrary, {
        minLength: 1,
        maxLength: options.singleInlineRun ? 1 : 3,
      }),
    })
    .map((block) =>
      paragraphBlock({ ...block, content: normalizeInlineRuns(block.content) }),
    );
}

function headingBlockArbitrary(
  options: SingleInlineRunOption,
): fc.Arbitrary<Block> {
  return fc
    .record({
      id: fc.constant("temp"),
      level: fc.integer({ min: 1, max: 6 }) as fc.Arbitrary<
        1 | 2 | 3 | 4 | 5 | 6
      >,
      content: fc.array(inlineArbitrary, {
        minLength: 1,
        maxLength: options.singleInlineRun ? 1 : 3,
      }),
    })
    .map((block) =>
      headingBlock({ ...block, content: normalizeInlineRuns(block.content) }),
    );
}

const codeBlockArbitrary: fc.Arbitrary<Block> = fc
  .record({
    id: fc.constant("temp"),
    language: fc.option(fc.constantFrom("ts", "js", "json", "md"), {
      nil: undefined,
    }),
    source: fc.array(safeTextArbitrary, { minLength: 1, maxLength: 3 }),
  })
  .map(({ source, ...rest }) =>
    codeBlock({
      ...stripUndefined(rest),
      source: source.join("\n"),
    }),
  );

const mermaidBlockArbitrary: fc.Arbitrary<Block> = fc
  .record({
    id: fc.constant("temp"),
    source: fc.constantFrom(
      "graph TD; A-->B;",
      "graph LR; Start-->Stop;",
      "flowchart TD; X-->Y;",
    ),
  })
  .map((block) => mermaidBlock(stripUndefined(block)));

const moonlightBlockArbitrary: fc.Arbitrary<Block> = fc
  .record({
    id: fc.constant("temp"),
    svg: safeTextArbitrary.map(
      (text) =>
        `<svg viewBox="0 0 120 80"><text>${escapeXml(text)}</text></svg>`,
    ),
    caption: fc.option(safeTextArbitrary, { nil: undefined }),
  })
  .map((block) => moonlightBlock(stripUndefined(block)));

export const gfmCompatibleTableBlockArbitrary: fc.Arbitrary<TableBlock> = fc
  .integer({ min: 1, max: 3 })
  .chain((columnCount) =>
    fc
      .record({
        headers: fc.array(safeTextArbitrary, {
          minLength: columnCount,
          maxLength: columnCount,
        }),
        aligns: fc.array(
          fc.option(fc.constantFrom("left", "center", "right"), {
            nil: undefined,
          }),
          {
            minLength: columnCount,
            maxLength: columnCount,
          },
        ),
        rows: fc.array(
          fc.array(safeTextArbitrary, {
            minLength: columnCount,
            maxLength: columnCount,
          }),
          { minLength: 1, maxLength: 3 },
        ),
      })
      .map(({ headers, aligns, rows }) => {
        const usedKeys = new Set<string>();
        return tableBlock({
          id: "temp",
          columns: headers.map((header, index) =>
            stripUndefined({
              key: uniqueColumnKey(header, index, usedKeys),
              header,
              align: aligns[index],
            }),
          ),
          rows: rows.map((row) => row.map((text) => ({ text }))),
        });
      }),
  );

export const fencedTableBlockArbitrary: fc.Arbitrary<TableBlock> = fc
  .integer({ min: 1, max: 3 })
  .chain((columnCount) => {
    const fenceTriggerArbitrary = fc.constantFrom(
      ...(columnCount > 1
        ? (["caption", "width", "non-derivable-key", "colspan"] as const)
        : (["caption", "width", "non-derivable-key"] as const)),
    );

    return fc
      .record({
        headers: fc.array(safeTextArbitrary, {
          minLength: columnCount,
          maxLength: columnCount,
        }),
        rows: fc.array(
          fc.array(safeTextArbitrary, {
            minLength: columnCount,
            maxLength: columnCount,
          }),
          { minLength: 1, maxLength: 3 },
        ),
        trigger: fenceTriggerArbitrary,
        caption: fc.option(safeTextArbitrary, { nil: undefined }),
        widthColumnIndex: fc.integer({ min: 0, max: columnCount - 1 }),
        customKeyColumnIndex: fc.integer({ min: 0, max: columnCount - 1 }),
        colspanPosition:
          columnCount > 1
            ? fc.record({
                rowIndex: fc.integer({ min: 0, max: 2 }),
                cellIndex: fc.integer({ min: 0, max: columnCount - 1 }),
              })
            : fc.constant({ rowIndex: 0, cellIndex: 0 }),
      })
      .map(
        ({
          headers,
          rows,
          trigger,
          caption,
          widthColumnIndex,
          customKeyColumnIndex,
          colspanPosition,
        }) => {
          const usedKeys = new Set<string>();
          return tableBlock({
            id: "temp",
            columns: headers.map((header, index) =>
              stripUndefined({
                key:
                  trigger === "non-derivable-key" &&
                  index === customKeyColumnIndex
                    ? uniqueColumnKey(`field-${index + 1}`, index, usedKeys)
                    : uniqueColumnKey(header, index, usedKeys),
                header,
                width:
                  trigger === "width" && index === widthColumnIndex
                    ? 240
                    : undefined,
              }),
            ),
            rows: rows.map((row, rowIndex) =>
              row.map((text, cellIndex) =>
                stripUndefined({
                  text,
                  colspan:
                    trigger === "colspan" &&
                    rowIndex ===
                      Math.min(colspanPosition.rowIndex, rows.length - 1) &&
                    cellIndex ===
                      Math.min(colspanPosition.cellIndex, row.length - 1)
                      ? 2
                      : undefined,
                }),
              ),
            ),
            ...(trigger === "caption" && {
              caption: caption ?? "captioned table",
            }),
          });
        },
      );
  });

function blockArbitrary(
  maxDepth: number,
  options: SingleInlineRunOption,
): fc.Arbitrary<Block> {
  const leaf = fc.oneof(
    paragraphBlockArbitrary(options),
    headingBlockArbitrary(options),
    codeBlockArbitrary,
    mermaidBlockArbitrary,
    moonlightBlockArbitrary,
    gfmCompatibleTableBlockArbitrary,
    fencedTableBlockArbitrary,
  );

  if (maxDepth <= 0) return leaf;

  return fc.oneof(leaf, listBlockArbitrary(maxDepth - 1, options));
}

function listItemArbitrary(
  maxDepth: number,
  options: SingleInlineRunOption,
): fc.Arbitrary<ListItem> {
  return fc.record({
    blocks: fc.array(blockArbitrary(maxDepth, options), {
      minLength: 1,
      maxLength: 3,
    }),
  });
}

function listBlockArbitrary(
  maxDepth: number,
  options: SingleInlineRunOption,
): fc.Arbitrary<ListBlock> {
  return fc
    .record({
      id: fc.constant("temp"),
      ordered: fc.boolean(),
      items: fc.array(listItemArbitrary(maxDepth, options), {
        minLength: 1,
        maxLength: 3,
      }),
    })
    .map(listBlock);
}

export function papyrDocumentArbitrary(
  options: {
    maxBlocks?: number;
    maxDepth?: number;
    singleInlineRun?: boolean;
  } = {},
): fc.Arbitrary<PapyrDocument> {
  const { maxBlocks = 5, maxDepth = 2, singleInlineRun = false } = options;
  return fc
    .record({
      id: fc.integer({ min: 1, max: 9999 }).map((n) => `doc-${n}`),
      title: fc.option(safeTextArbitrary, { nil: undefined }),
      blocks: fc.array(blockArbitrary(maxDepth, { singleInlineRun }), {
        maxLength: maxBlocks,
      }),
    })
    .map(assignDocumentBlockIds)
    .map((doc) => stripUndefined({ ...doc }) as PapyrDocument);
}

export function normalizeBlocks(blocks: Block[]): unknown[] {
  return blocks.map(normalizeBlock);
}

export function flattenBlocks(blocks: Block[]): Block[] {
  return blocks.flatMap((block) => {
    if (!isListBlock(block)) return [block];
    return [
      block,
      ...flattenBlocks(block[1].items.flatMap((item) => item.blocks)),
    ];
  });
}

function assignDocumentBlockIds(doc: PapyrDocument): PapyrDocument {
  let index = 0;
  return {
    ...doc,
    blocks: assignBlockIds(doc.blocks, () => `b${++index}`),
  };
}

function assignBlockIds(blocks: Block[], makeId: () => string): Block[] {
  return blocks.map((block) => {
    const id = makeId();
    switch (block[0]) {
      case "Paragraph":
        return paragraphBlock({ ...block[1], id });
      case "Heading":
        return headingBlock({ ...block[1], id });
      case "Code":
        return codeBlock({ ...block[1], id });
      case "Table":
        return tableBlock({ ...block[1], id });
      case "Mermaid":
        return mermaidBlock({ ...block[1], id });
      case "Moonlight":
        return moonlightBlock({ ...block[1], id });
      case "List":
        return listBlock({
          ...block[1],
          id,
          items: block[1].items.map((item) => ({
            blocks: assignBlockIds(item.blocks, makeId),
          })),
        });
    }
  });
}

function normalizeBlock(block: Block): unknown {
  switch (block[0]) {
    case "Paragraph":
      return [
        "Paragraph",
        {
          content: normalizeInlineRuns(block[1].content),
        },
      ];
    case "Heading":
      return [
        "Heading",
        {
          level: block[1].level,
          content: normalizeInlineRuns(block[1].content),
        },
      ];
    case "List":
      return [
        "List",
        {
          ordered: block[1].ordered,
          items: block[1].items.map((item) => ({
            blocks: item.blocks.map(normalizeBlock),
          })),
        },
      ];
    case "Code":
      return [
        "Code",
        stripUndefined({
          language: block[1].language,
          source: block[1].source,
        }),
      ];
    case "Table":
      return [
        "Table",
        stripUndefined({
          columns: block[1].columns.map((column) =>
            stripUndefined({
              key: column.key,
              header: column.header,
              align: column.align,
              width: column.width,
            }),
          ),
          rows: block[1].rows.map((row) =>
            row.map((cell) => stripUndefined(cell)),
          ),
          caption: block[1].caption,
        }),
      ];
    case "Mermaid":
      return [
        "Mermaid",
        stripUndefined({
          source: block[1].source,
          caption: block[1].caption,
        }),
      ];
    case "Moonlight":
      return [
        "Moonlight",
        stripUndefined({
          svg: block[1].svg,
          caption: block[1].caption,
        }),
      ];
  }
}

function normalizeInline(run: Inline): Inline {
  const marks = normalizeMarks(run.marks ?? []);
  return {
    text: run.text,
    ...(marks.length > 0 && { marks }),
    ...(marks.includes("link") && run.href !== undefined && { href: run.href }),
  };
}

function normalizeInlineRuns(runs: Inline[]): Inline[] {
  const merged: Inline[] = [];
  for (const run of runs.map(normalizeInline)) {
    const previous = merged.at(-1);
    if (
      previous &&
      areSameMarks(previous.marks ?? [], run.marks ?? []) &&
      previous.href === run.href
    ) {
      previous.text += run.text;
      continue;
    }
    merged.push({ ...run });
  }
  return merged;
}

function areSameMarks(left: Mark[], right: Mark[]): boolean {
  return (
    left.length === right.length &&
    left.every((mark, index) => mark === right[index])
  );
}

function normalizeMarks(marks: Mark[]): Mark[] {
  return [...new Set(marks)].sort(
    (left, right) => MARK_ORDER.indexOf(left) - MARK_ORDER.indexOf(right),
  );
}

function uniqueColumnKey(
  header: string,
  index: number,
  usedKeys: Set<string>,
): string {
  const base = normalizeColumnKey(header) || `column-${index + 1}`;
  let key = base;
  let suffix = 2;
  while (usedKeys.has(key)) {
    key = `${base}-${suffix++}`;
  }
  usedKeys.add(key);
  return key;
}

function normalizeColumnKey(value: string): string {
  return value
    .trim()
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

function stripUndefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
