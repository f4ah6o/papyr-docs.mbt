import * as v from "valibot";

export interface Inline {
  text: string;
  marks?: ("bold" | "italic" | "code" | "strike" | "link")[];
  href?: string;
}

export interface ListItem {
  blocks: Block[];
}

export interface TableColumn {
  key: string;
  header: string;
  align?: "left" | "center" | "right" | string;
  width?: unknown;
}

export interface TableCell {
  text: string;
  colspan?: number;
  rowspan?: number;
}

export type HeadingBlock = [
  "Heading",
  { id: string; level: number; content: Inline[] },
];
export type ParagraphBlock = ["Paragraph", { id: string; content: Inline[] }];
export type ListBlock = [
  "List",
  { id: string; ordered: boolean; items: ListItem[] },
];
export type CodeBlock = [
  "Code",
  { id: string; language?: string; source: string },
];
export type TableBlock = [
  "Table",
  { id: string; columns: TableColumn[]; rows: TableCell[][]; caption?: string },
];
export type MermaidBlock = [
  "Mermaid",
  { id: string; source: string; caption?: string },
];
export type MoonlightBlock = [
  "Moonlight",
  {
    id: string;
    svg: string;
    caption?: string;
  },
];

export type Block =
  | HeadingBlock
  | ParagraphBlock
  | ListBlock
  | CodeBlock
  | TableBlock
  | MermaidBlock
  | MoonlightBlock;

export interface PapyrDocument {
  id: string;
  title?: string;
  blocks: Block[];
  meta?: Record<string, unknown>;
}

export const InlineSchema = v.object({
  text: v.string(),
  marks: v.optional(
    v.array(v.picklist(["bold", "italic", "code", "strike", "link"])),
  ),
  href: v.optional(v.string()),
});

export const DocumentSchema: v.GenericSchema<PapyrDocument> = v.custom(
  (input): input is PapyrDocument => validateDocument(input).success,
  "Invalid PapyrDocument",
);
export const BlockSchema: v.GenericSchema<Block> = v.custom(
  (input): input is Block => validateBlock(input, "block").length === 0,
  "Invalid PapyrDocument block",
);
export const HeadingBlockSchema = BlockSchema as v.GenericSchema<HeadingBlock>;
export const ParagraphBlockSchema =
  BlockSchema as v.GenericSchema<ParagraphBlock>;
export const ListBlockSchema = BlockSchema as v.GenericSchema<ListBlock>;
export const CodeBlockSchema = BlockSchema as v.GenericSchema<CodeBlock>;
export const ListItemSchema: v.GenericSchema<ListItem> = v.custom(
  (input): input is ListItem =>
    isObject(input) &&
    Array.isArray(input.blocks) &&
    input.blocks.length > 0 &&
    input.blocks.flatMap((block, index) =>
      validateBlock(block, `blocks.${index}`),
    ).length === 0,
  "Invalid PapyrDocument list item",
);

export type DocumentValidationPathSegment = string | number;
export type DocumentValidationIssues = [
  DocumentValidationIssue,
  ...DocumentValidationIssue[],
];
type AnyValiError = v.ValiError<
  | v.BaseSchema<unknown, unknown, v.BaseIssue<unknown>>
  | v.BaseSchemaAsync<unknown, unknown, v.BaseIssue<unknown>>
>;

export interface DocumentValidationIssue {
  kind: "schema" | "validation" | "transformation";
  type: string;
  path: DocumentValidationPathSegment[];
  pathString: string | null;
  expected: string | null;
  received: string;
  message: string;
}

export type DocumentValidationResult =
  | { success: true; document: PapyrDocument }
  | {
      success: false;
      issues: DocumentValidationIssues;
      error: PapyrDocumentValidationError;
    };

export class PapyrDocumentValidationError extends Error {
  readonly issues: DocumentValidationIssues;

  constructor(issues: DocumentValidationIssues) {
    super(formatDocumentValidationError(issues));
    this.name = "PapyrDocumentValidationError";
    this.issues = issues;
  }
}

export function validateDocument(input: unknown): DocumentValidationResult {
  const issues = validateDocumentShape(input);
  if (issues.length === 0) {
    return { success: true, document: input as PapyrDocument };
  }
  const nonEmpty = issues as DocumentValidationIssues;
  return {
    success: false,
    issues: nonEmpty,
    error: new PapyrDocumentValidationError(nonEmpty),
  };
}

export function parseDocument(input: unknown): PapyrDocument {
  const result = validateDocument(input);
  if (!result.success) throw result.error;
  return result.document;
}

export function isPapyrDocumentValidationError(
  error: unknown,
): error is PapyrDocumentValidationError {
  return error instanceof PapyrDocumentValidationError;
}

export function getDocumentValidationIssues(
  issuesOrError:
    | PapyrDocumentValidationError
    | AnyValiError
    | DocumentValidationIssues,
): DocumentValidationIssues {
  if (issuesOrError instanceof PapyrDocumentValidationError)
    return issuesOrError.issues;
  if (Array.isArray(issuesOrError)) return issuesOrError;
  return [
    issue(
      ["document"],
      "PapyrDocument",
      JSON.stringify(issuesOrError),
      "Invalid PapyrDocument",
    ),
  ];
}

export function formatDocumentValidationError(
  issuesOrError:
    | PapyrDocumentValidationError
    | AnyValiError
    | DocumentValidationIssues,
  options?: { maxIssues?: number },
): string {
  const issues = getDocumentValidationIssues(issuesOrError);
  const maxIssues = options?.maxIssues ?? issues.length;
  const renderedIssues = issues
    .slice(0, maxIssues)
    .map(
      (validationIssue) =>
        `- ${formatDocumentValidationIssue(validationIssue)}`,
    );
  const remainingIssues = issues.length - maxIssues;
  if (renderedIssues.length === 0) return "PapyrDocument validation failed.";
  const lines = ["PapyrDocument validation failed.", ...renderedIssues];
  if (remainingIssues > 0)
    lines.push(`- ...and ${remainingIssues} more issue(s)`);
  return lines.join("\n");
}

export function formatDocumentValidationIssue(
  validationIssue: DocumentValidationIssue,
): string {
  const target = validationIssue.pathString ?? "document";
  if (validationIssue.expected) {
    return `${target}: expected ${validationIssue.expected} but received ${validationIssue.received}`;
  }
  return `${target}: ${validationIssue.message}`;
}

export function blockKind(block: Block): Block[0] {
  return block[0];
}

export function blockPayload<T extends Block>(block: T): T[1] {
  return block[1];
}

export function paragraphBlock(payload: ParagraphBlock[1]): ParagraphBlock {
  return ["Paragraph", payload];
}

export function headingBlock(payload: HeadingBlock[1]): HeadingBlock {
  return ["Heading", payload];
}

export function listBlock(payload: ListBlock[1]): ListBlock {
  return ["List", payload];
}

export function codeBlock(payload: CodeBlock[1]): CodeBlock {
  return ["Code", payload];
}

export function tableBlock(payload: TableBlock[1]): TableBlock {
  return ["Table", payload];
}

export function mermaidBlock(payload: MermaidBlock[1]): MermaidBlock {
  return ["Mermaid", payload];
}

export function moonlightBlock(payload: MoonlightBlock[1]): MoonlightBlock {
  return ["Moonlight", payload];
}

export function isBlockKind<TKind extends Block[0]>(
  block: Block | undefined,
  kind: TKind,
): block is Extract<Block, [TKind, unknown]> {
  return block?.[0] === kind;
}

function validateDocumentShape(input: unknown): DocumentValidationIssue[] {
  if (!isObject(input))
    return [issue([], "PapyrDocument object", received(input))];
  const issues: DocumentValidationIssue[] = [];
  if (typeof input.id !== "string")
    issues.push(issue(["id"], "string", received(input.id)));
  else if (input.id.length === 0)
    issues.push(
      issue(["id"], "non-empty string", "empty string", "id cannot be empty"),
    );
  if (input.title !== undefined && typeof input.title !== "string")
    issues.push(issue(["title"], "string", received(input.title)));
  if (!Array.isArray(input.blocks)) {
    issues.push(issue(["blocks"], "Array", received(input.blocks)));
  } else {
    input.blocks.forEach((block, index) => {
      issues.push(...validateBlock(block, `blocks.${index}`));
    });
  }
  return issues;
}

function validateBlock(
  input: unknown,
  path: string,
): DocumentValidationIssue[] {
  if (
    !Array.isArray(input) ||
    input.length !== 2 ||
    typeof input[0] !== "string"
  ) {
    return [issue(split(path), "MoonBit tuple variant block", received(input))];
  }
  const [tag, payload] = input;
  if (!isObject(payload))
    return [issue([...split(path), 1], "object", received(payload))];
  const issues: DocumentValidationIssue[] = [];
  if (typeof payload.id !== "string")
    issues.push(issue([...split(path), "id"], "string", received(payload.id)));
  switch (tag) {
    case "Heading":
      if (
        typeof payload.level !== "number" ||
        payload.level < 1 ||
        payload.level > 6
      ) {
        issues.push(
          issue(
            [...split(path), "level"],
            "integer in range 1..6",
            received(payload.level),
          ),
        );
      }
      issues.push(
        ...validateInlineArray(payload.content, [...split(path), "content"]),
      );
      break;
    case "Paragraph":
      issues.push(
        ...validateInlineArray(payload.content, [...split(path), "content"]),
      );
      break;
    case "List":
      if (typeof payload.ordered !== "boolean")
        issues.push(
          issue(
            [...split(path), "ordered"],
            "boolean",
            received(payload.ordered),
          ),
        );
      if (!Array.isArray(payload.items)) {
        issues.push(
          issue([...split(path), "items"], "Array", received(payload.items)),
        );
      } else {
        payload.items.forEach((item, index) => {
          if (
            !isObject(item) ||
            !Array.isArray(item.blocks) ||
            item.blocks.length === 0
          ) {
            issues.push(
              issue(
                [...split(path), "items", index, "blocks"],
                "non-empty Array",
                received(isObject(item) ? item.blocks : item),
              ),
            );
          } else {
            item.blocks.forEach((block, blockIndex) => {
              issues.push(
                ...validateBlock(
                  block,
                  `${path}.items.${index}.blocks.${blockIndex}`,
                ),
              );
            });
          }
        });
      }
      break;
    case "Code":
      if (
        payload.language !== undefined &&
        typeof payload.language !== "string"
      )
        issues.push(
          issue(
            [...split(path), "language"],
            "string",
            received(payload.language),
          ),
        );
      if (typeof payload.source !== "string")
        issues.push(
          issue([...split(path), "source"], "string", received(payload.source)),
        );
      break;
    case "Table":
    case "Mermaid":
      break;
    case "Moonlight":
      if (typeof payload.svg !== "string")
        issues.push(
          issue([...split(path), "svg"], "string", received(payload.svg)),
        );
      break;
    default:
      issues.push(
        issue(
          [...split(path), 0],
          '"Heading" | "Paragraph" | "List" | "Code" | "Table" | "Mermaid" | "Moonlight"',
          JSON.stringify(tag),
        ),
      );
  }
  return issues;
}

function validateInlineArray(
  input: unknown,
  path: DocumentValidationPathSegment[],
): DocumentValidationIssue[] {
  if (!Array.isArray(input)) return [issue(path, "Array", received(input))];
  const issues: DocumentValidationIssue[] = [];
  input.forEach((run, index) => {
    if (!isObject(run)) {
      issues.push(issue([...path, index], "object", received(run)));
      return;
    }
    if (typeof run.text !== "string")
      issues.push(
        issue([...path, index, "text"], "string", received(run.text)),
      );
    if (run.marks !== undefined && !Array.isArray(run.marks)) {
      issues.push(
        issue([...path, index, "marks"], "Array", received(run.marks)),
      );
    } else if (Array.isArray(run.marks)) {
      for (const [markIndex, mark] of run.marks.entries()) {
        if (
          !["bold", "italic", "code", "strike", "link"].includes(String(mark))
        ) {
          issues.push(
            issue(
              [...path, index, "marks", markIndex],
              "one of bold, italic, code, strike, link",
              received(mark),
            ),
          );
        }
      }
      if (run.marks.includes("link") && typeof run.href !== "string") {
        issues.push(
          issue([...path, index, "href"], "string", received(run.href)),
        );
      }
    }
  });
  return issues;
}

function issue(
  path: DocumentValidationPathSegment[],
  expected: string,
  got: string,
  message = `Expected ${expected} but received ${got}`,
): DocumentValidationIssue {
  return {
    kind: "validation",
    type: "validation",
    path,
    pathString: path.length > 0 ? path.join(".") : null,
    expected,
    received: got,
    message,
  };
}

function split(path: string): DocumentValidationPathSegment[] {
  if (!path) return [];
  return path
    .split(".")
    .map((part) => (/^\d+$/.test(part) ? Number(part) : part));
}

function isObject(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function received(input: unknown): string {
  if (input === undefined) return "undefined";
  if (input === null) return "null";
  if (typeof input === "string") return JSON.stringify(input);
  return String(input);
}
