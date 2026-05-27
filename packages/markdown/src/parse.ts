import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import type {
  Code,
  Heading,
  List as MdList,
  ListItem as MdListItem,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
  Table as MdTable,
  TableCell as MdTableCell,
} from 'mdast';
import { gfm } from 'micromark-extension-gfm';
import type {
  Block,
  ExcalidrawBlock,
  Inline,
  ListBlock,
  ListItem,
  PapyrDocument,
  TableBlock,
  TableColumn,
} from '@f12o/papyr-core';
import { MERMAID_FENCE, PAPYR_EXCALIDRAW_FENCE, PAPYR_TABLE_FENCE } from './fences.js';

export interface ParseOptions {
  documentId?: string;
  /** Override id generation (useful for deterministic tests). */
  generateId?: () => string;
}

export class UnsupportedMarkdownError extends Error {}

/**
 * Parses Markdown into a PapyrDocument structure.
 *
 * Supports a strict subset of GFM Markdown: headings, paragraphs, lists,
 * code blocks, tables, and specific inline marks (bold, italic, code, strike, links).
 *
 * **Strict validation:** Explicitly rejects unsupported constructs (footnotes,
 * task lists, images, HTML, etc.) by throwing UnsupportedMarkdownError
 * instead of silently dropping them.
 *
 * @param input - Markdown source string
 * @param options - Optional document ID and ID generator override
 * @returns Parsed PapyrDocument
 * @throws {UnsupportedMarkdownError} if input contains unsupported Markdown
 */
export function parseMarkdown(input: string, options: ParseOptions = {}): PapyrDocument {
  const tree = fromMarkdown(input, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
  validateRoot(tree);
  const makeId = options.generateId ?? defaultIdGenerator();
  const blocks = tree.children.flatMap((node) => convertRootChild(node, makeId));
  return {
    id: options.documentId ?? 'untitled',
    blocks,
  };
}

/**
 * Validates that a Markdown string uses only the supported Papyr subset.
 *
 * Similar to parseMarkdown but performs only validation without constructing
 * a full PapyrDocument. Throws UnsupportedMarkdownError if any unsupported
 * constructs are detected (footnotes, task lists, images, HTML, etc.).
 *
 * @param input - Markdown source string to validate
 * @throws {UnsupportedMarkdownError} if input contains unsupported Markdown
 */
export function assertPapyrMarkdownSubset(input: string): void {
  const tree = fromMarkdown(input, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
  validateRoot(tree);
}

function defaultIdGenerator(): () => string {
  let n = 0;
  return () => `b${++n}`;
}

function validateRoot(tree: Root): void {
  for (const node of tree.children) validateRootChild(node);
}

function validateRootChild(node: RootContent): void {
  switch (node.type) {
    case 'heading':
    case 'paragraph':
      validateInlineNodes(node.children);
      return;
    case 'list':
      for (const item of node.children) validateListItem(item);
      return;
    case 'table':
      validateTable(node);
      return;
    case 'code':
      return;
    default:
      throw new UnsupportedMarkdownError(`Unsupported Markdown block: ${node.type}`);
  }
}

function validateListItem(item: MdListItem): void {
  if (item.checked !== null && item.checked !== undefined) {
    throw new UnsupportedMarkdownError('Unsupported Markdown block: taskListItem');
  }
  for (const child of item.children) {
    switch (child.type) {
      case 'paragraph':
      case 'heading':
        validateInlineNodes(child.children);
        break;
      case 'list':
        for (const nestedItem of child.children) validateListItem(nestedItem);
        break;
      case 'table':
        validateTable(child);
        break;
      case 'code':
        break;
      default:
        throw new UnsupportedMarkdownError(`Unsupported Markdown block: ${child.type}`);
    }
  }
}

function validateTable(table: MdTable): void {
  for (const row of table.children) {
    for (const cell of row.children) {
      validateInlineNodes(cell.children);
    }
  }
}

function validateInlineNodes(nodes: PhrasingContent[]): void {
  for (const node of nodes) validateInlineNode(node);
}

function validateInlineNode(node: PhrasingContent): void {
  switch (node.type) {
    case 'text':
    case 'inlineCode':
    case 'break':
      return;
    case 'emphasis':
    case 'strong':
    case 'delete':
    case 'link':
      validateInlineNodes(node.children);
      return;
    default:
      throw new UnsupportedMarkdownError(`Unsupported Markdown inline: ${node.type}`);
  }
}

function convertRootChild(node: RootContent, makeId: () => string): Block[] {
  return convertBlockNode(node, makeId);
}

function convertBlockNode(
  node: RootContent | MdListItem['children'][number],
  makeId: () => string,
): Block[] {
  switch (node.type) {
    case 'heading':
      return [convertHeading(node, makeId)];
    case 'paragraph':
      return [convertParagraph(node, makeId)];
    case 'list':
      return [convertList(node, makeId)];
    case 'code':
      return [convertCode(node, makeId)];
    case 'table':
      return [convertTable(node, makeId)];
    default:
      return [];
  }
}

function convertHeading(node: Heading, makeId: () => string): Block {
  return ['Heading', {
    id: makeId(),
    level: node.depth,
    content: convertInline(node.children),
  }];
}

function convertParagraph(node: Paragraph, makeId: () => string): Block {
  return ['Paragraph', {
    id: makeId(),
    content: convertInline(node.children),
  }];
}

function convertList(node: MdList, makeId: () => string): ListBlock {
  return ['List', {
    id: makeId(),
    ordered: Boolean(node.ordered),
    items: node.children.map((item) => convertListItem(item, makeId)),
  }];
}

function convertListItem(item: MdListItem, makeId: () => string): ListItem {
  const blocks = item.children.flatMap((child) => convertBlockNode(child, makeId));
  return {
    blocks: blocks.length > 0 ? blocks : [emptyParagraph(makeId())],
  };
}

function convertCode(node: Code, makeId: () => string): Block {
  const lang = node.lang ?? undefined;
  if (lang === PAPYR_TABLE_FENCE) return decodeTable(node.value, makeId());
  if (lang === PAPYR_EXCALIDRAW_FENCE) return decodeExcalidraw(node.value, makeId());
  if (lang === MERMAID_FENCE) {
    return ['Mermaid', { id: makeId(), source: node.value }];
  }
  return ['Code', {
    id: makeId(),
    ...(lang !== undefined && { language: lang }),
    source: node.value,
  }];
}

function convertTable(node: MdTable, makeId: () => string): TableBlock {
  const [headerRow, ...bodyRows] = node.children;
  const columnCount = Math.max(
    headerRow?.children.length ?? 0,
    ...bodyRows.map((row) => row.children.length),
    0,
  );
  const usedKeys = new Set<string>();

  return ['Table', {
    id: makeId(),
    columns: Array.from({ length: columnCount }, (_, index) => {
      const header = tableCellText(headerRow?.children[index]);
      const align = normalizeTableAlign(node.align?.[index]);
      return {
        key: uniqueColumnKey(header, index, usedKeys),
        header,
        ...(align !== undefined && { align }),
      };
    }),
    rows: bodyRows.map((row) =>
      Array.from({ length: columnCount }, (_, index) => ({
        text: tableCellText(row.children[index]),
      })),
    ),
  }];
}

function decodeTable(value: string, id: string): TableBlock {
  const parsed = JSON.parse(value) as Omit<TableBlock[1], 'id'>;
  return ['Table', { id, ...parsed }];
}

function decodeExcalidraw(value: string, id: string): ExcalidrawBlock {
  const parsed = JSON.parse(value) as Omit<ExcalidrawBlock[1], 'id'>;
  return ['Excalidraw', { id, ...parsed }];
}

function emptyParagraph(id: string): Block {
  return ['Paragraph', { id, content: [] }];
}

type Mark = NonNullable<Inline['marks']>[number];

function convertInline(nodes: PhrasingContent[]): Inline[] {
  const runs: Inline[] = [];
  for (const node of nodes) collectInline(node, [], undefined, runs);
  return runs;
}

function collectInline(
  node: PhrasingContent,
  marks: Mark[],
  href: string | undefined,
  out: Inline[],
): void {
  switch (node.type) {
    case 'text':
      out.push(buildInline(node.value, marks, href));
      return;
    case 'inlineCode':
      out.push(buildInline(node.value, dedup([...marks, 'code']), href));
      return;
    case 'emphasis':
      for (const child of node.children)
        collectInline(child, dedup([...marks, 'italic']), href, out);
      return;
    case 'strong':
      for (const child of node.children) collectInline(child, dedup([...marks, 'bold']), href, out);
      return;
    case 'delete':
      for (const child of node.children)
        collectInline(child, dedup([...marks, 'strike']), href, out);
      return;
    case 'link':
      for (const child of node.children)
        collectInline(child, dedup([...marks, 'link']), node.url, out);
      return;
    case 'break':
      out.push(buildInline('\n', marks, href));
      return;
    default:
      return;
  }
}

function buildInline(text: string, marks: Mark[], href: string | undefined): Inline {
  return {
    text,
    ...(marks.length > 0 && { marks }),
    ...(href !== undefined && { href }),
  };
}

function dedup(marks: Mark[]): Mark[] {
  return [...new Set(marks)];
}

function tableCellText(cell: MdTableCell | undefined): string {
  if (!cell) return '';
  return convertInline(cell.children)
    .map((run) => run.text)
    .join('');
}

function normalizeTableAlign(
  value: TableColumn['align'] | null | undefined,
): TableColumn['align'] | undefined {
  return value ?? undefined;
}

function uniqueColumnKey(header: string, index: number, usedKeys: Set<string>): string {
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
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}
