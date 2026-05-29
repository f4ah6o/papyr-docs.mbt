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
import {
  codeBlock,
  moonlightBlock,
  headingBlock,
  listBlock,
  mermaidBlock,
  paragraphBlock,
  tableBlock,
} from "@f12o/papyr-core";

export interface ProseMirrorMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface ProseMirrorNode {
  type: string;
  content?: ProseMirrorNode[];
  attrs?: Record<string, unknown>;
  text?: string;
  marks?: ProseMirrorMark[];
}

export interface ConvertOptions {
  generateId?: () => string;
}

type Mark = NonNullable<Inline["marks"]>[number];

const MARK_TO_PM: Record<Mark, string> = {
  bold: "bold",
  italic: "italic",
  code: "code",
  strike: "strike",
  link: "link",
};

const PM_TO_MARK: Record<string, Mark> = {
  bold: "bold",
  strong: "bold",
  italic: "italic",
  em: "italic",
  code: "code",
  strike: "strike",
  s: "strike",
  link: "link",
};

export function documentToProseMirror(doc: PapyrDocument): ProseMirrorNode {
  return {
    type: "doc",
    content: doc.blocks.map(blockToPm),
  };
}

function blockToPm(block: Block): ProseMirrorNode {
  switch (block[0]) {
    case "Paragraph":
      return paragraphToPm(block);
    case "Heading":
      return headingToPm(block);
    case "List":
      return listToPm(block);
    case "Code":
      return codeToPm(block);
    case "Mermaid":
      return mermaidToPm(block);
    case "Table":
      return tableToPm(block);
    case "Moonlight":
      return moonlightToPm(block);
  }
}

function paragraphToPm(block: ParagraphBlock): ProseMirrorNode {
  return { type: "paragraph", content: inlineToPm(block[1].content) };
}

function headingToPm(block: HeadingBlock): ProseMirrorNode {
  return {
    type: "heading",
    attrs: { level: block[1].level },
    content: inlineToPm(block[1].content),
  };
}

function listToPm(block: ListBlock): ProseMirrorNode {
  return {
    type: block[1].ordered ? "orderedList" : "bulletList",
    content: block[1].items.map(listItemToPm),
  };
}

function listItemToPm(item: ListItem): ProseMirrorNode {
  return {
    type: "listItem",
    content: item.blocks.map(blockToPm),
  };
}

function codeToPm(block: CodeBlock): ProseMirrorNode {
  const payload = block[1];
  return {
    type: "codeBlock",
    ...(payload.language !== undefined && {
      attrs: { language: payload.language },
    }),
    content: payload.source ? [{ type: "text", text: payload.source }] : [],
  };
}

function mermaidToPm(block: MermaidBlock): ProseMirrorNode {
  const payload = block[1];
  return {
    type: "papyrMermaid",
    attrs: {
      id: payload.id,
      source: payload.source,
      ...(payload.caption !== undefined && { caption: payload.caption }),
    },
  };
}

function tableToPm(block: TableBlock): ProseMirrorNode {
  const { id, ...data } = block[1];
  return { type: "papyrTable", attrs: { id, data } };
}

function moonlightToPm(block: MoonlightBlock): ProseMirrorNode {
  const { id, ...data } = block[1];
  return { type: "papyrMoonlight", attrs: { id, data } };
}

function inlineToPm(runs: Inline[]): ProseMirrorNode[] {
  return runs.map((run) => {
    const marks: ProseMirrorMark[] = (run.marks ?? []).map((m) => {
      if (m === "link")
        return { type: "link", attrs: { href: run.href ?? "" } };
      return { type: MARK_TO_PM[m] };
    });
    return {
      type: "text",
      text: run.text,
      ...(marks.length > 0 && { marks }),
    };
  });
}

export function proseMirrorToDocument(
  pm: ProseMirrorNode,
  id: string,
  options: ConvertOptions = {},
): PapyrDocument {
  const makeId = options.generateId ?? defaultIdGenerator();
  const blocks = (pm.content ?? []).flatMap((node) => pmToBlock(node, makeId));
  return { id, blocks };
}

function defaultIdGenerator(): () => string {
  let n = 0;
  return () => `b${++n}`;
}

function pmToBlock(node: ProseMirrorNode, makeId: () => string): Block[] {
  switch (node.type) {
    case "paragraph":
      return [
        paragraphBlock({
          id: makeId(),
          content: pmToInline(node.content ?? []),
        }),
      ];
    case "heading":
      return [
        headingBlock({
          id: makeId(),
          level: clampLevel(node.attrs?.level),
          content: pmToInline(node.content ?? []),
        }),
      ];
    case "bulletList":
    case "orderedList":
      return [
        listBlock({
          id: makeId(),
          ordered: node.type === "orderedList",
          items: (node.content ?? []).map((item) => pmListItem(item, makeId)),
        }),
      ];
    case "codeBlock": {
      const language = node.attrs?.language;
      const source = (node.content ?? []).map((c) => c.text ?? "").join("");
      return [
        codeBlock({
          id: makeId(),
          ...(typeof language === "string" && { language }),
          source,
        }),
      ];
    }
    case "papyrMermaid":
      return [
        mermaidBlock({
          id: resolveBlockId(node.attrs?.id, makeId),
          source: String(node.attrs?.source ?? ""),
          ...(typeof node.attrs?.caption === "string" && {
            caption: node.attrs.caption,
          }),
        }),
      ];
    case "papyrTable": {
      const data = (node.attrs?.data ?? {}) as Omit<TableBlock[1], "id">;
      return [
        tableBlock({ id: resolveBlockId(node.attrs?.id, makeId), ...data }),
      ];
    }
    case "papyrMoonlight": {
      return [
        moonlightBlock({
          id: resolveBlockId(node.attrs?.id, makeId),
          ...normalizeMoonlightData(node.attrs?.data),
        }),
      ];
    }
    default:
      return [];
  }
}

function pmListItem(itemNode: ProseMirrorNode, makeId: () => string): ListItem {
  const blocks = (itemNode.content ?? []).flatMap((node) =>
    pmToBlock(node, makeId),
  );
  return {
    blocks:
      blocks.length > 0
        ? blocks
        : [paragraphBlock({ id: makeId(), content: [] })],
  };
}

function pmToInline(nodes: ProseMirrorNode[]): Inline[] {
  return nodes.flatMap((node) => {
    if (node.type !== "text" || node.text === undefined) return [];
    const marks = collectMarks(node.marks ?? []);
    const linkMark = (node.marks ?? []).find((m) => m.type === "link");
    const href =
      typeof linkMark?.attrs?.href === "string"
        ? linkMark.attrs.href
        : undefined;
    const inline: Inline = {
      text: node.text,
      ...(marks.length > 0 && { marks }),
      ...(href !== undefined && { href }),
    };
    return [inline];
  });
}

function collectMarks(pmMarks: ProseMirrorMark[]): Mark[] {
  const out: Mark[] = [];
  for (const m of pmMarks) {
    const mapped = PM_TO_MARK[m.type];
    if (mapped && !out.includes(mapped)) out.push(mapped);
  }
  return out;
}

function clampLevel(value: unknown): 1 | 2 | 3 | 4 | 5 | 6 {
  const n = typeof value === "number" ? value : 1;
  if (n < 1) return 1;
  if (n > 6) return 6;
  return n as 1 | 2 | 3 | 4 | 5 | 6;
}

function resolveBlockId(value: unknown, makeId: () => string): string {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : makeId();
}

function normalizeMoonlightData(data: unknown): Omit<MoonlightBlock[1], "id"> {
  if (!isRecord(data)) return { svg: "" };
  return {
    svg: typeof data.svg === "string" ? data.svg : "",
    ...(typeof data.caption === "string" && { caption: data.caption }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
