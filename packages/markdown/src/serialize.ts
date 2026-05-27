import { gfmToMarkdown } from 'mdast-util-gfm';
import { toMarkdown } from 'mdast-util-to-markdown';
import type {
  AlignType,
  Code,
  Heading,
  List as MdList,
  ListItem as MdListItem,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
  TableCell as MdTableCell,
  TableRow as MdTableRow,
} from 'mdast';
import type {
  Block,
  CodeBlock,
  ExcalidrawBlock,
  HeadingBlock,
  Inline,
  ListBlock,
  ListItem,
  MermaidBlock,
  PapyrDocument,
  ParagraphBlock,
  TableBlock,
  TableColumn,
} from '@f12o/papyr-core';
import { MERMAID_FENCE, PAPYR_EXCALIDRAW_FENCE, PAPYR_TABLE_FENCE } from './fences.js';

export function serializeDocument(doc: PapyrDocument): string {
  const tree: Root = {
    type: 'root',
    children: doc.blocks.map((block) => blockToMdast(block)),
  };
  return toMarkdown(tree, { extensions: [gfmToMarkdown()] });
}

function blockToMdast(block: Block, inListItem = false): RootContent {
  switch (block[0]) {
    case 'Heading':
      return headingToMdast(block);
    case 'Paragraph':
      return paragraphToMdast(block);
    case 'List':
      return listToMdast(block);
    case 'Code':
      return codeToMdast(block);
    case 'Mermaid':
      return mermaidToMdast(block);
    case 'Table':
      return tableToMdast(block, inListItem);
    case 'Excalidraw':
      return excalidrawToMdast(block);
  }
}

function headingToMdast(block: HeadingBlock): Heading {
  const payload = block[1];
  return {
    type: 'heading',
    depth: payload.level as Heading['depth'],
    children: inlineToMdast(payload.content),
  };
}

function paragraphToMdast(block: ParagraphBlock): Paragraph {
  return { type: 'paragraph', children: inlineToMdast(block[1].content) };
}

function listToMdast(block: ListBlock): MdList {
  const payload = block[1];
  const children: MdListItem[] = payload.items.map(listItemToMdast);
  return {
    type: 'list',
    ordered: payload.ordered,
    // Any loose list item makes the whole list loose so nested block boundaries survive round-trip.
    spread: children.some((child) => child.spread),
    children,
  };
}

function listItemToMdast(item: ListItem): MdListItem {
  const children: MdListItem['children'] =
    item.blocks.length > 0
      ? item.blocks.map((block) => blockToMdast(block, true) as MdListItem['children'][number])
      : [{ type: 'paragraph', children: [] } as MdListItem['children'][number]];
  // Multi-block items and non-paragraph children require blank lines in markdown to remain distinct.
  const spread = children.length > 1 || children.some((child) => child.type !== 'paragraph');
  return { type: 'listItem', spread, children };
}

function codeToMdast(block: CodeBlock): Code {
  const payload = block[1];
  return {
    type: 'code',
    lang: payload.language ?? null,
    value: payload.source,
  };
}

function mermaidToMdast(block: MermaidBlock): Code {
  return { type: 'code', lang: MERMAID_FENCE, value: block[1].source };
}

function tableToMdast(block: TableBlock, inListItem: boolean): RootContent {
  const payload = block[1];
  if (canSerializeAsGfmTable(block, inListItem)) {
    return {
      type: 'table',
      align: payload.columns.map((column) => (column.align ?? null) as AlignType),
      children: [
        tableRowToMdast(payload.columns.map((column) => column.header)),
        ...payload.rows.map((row) => tableRowToMdast(row.map((cell) => cell.text))),
      ],
    };
  }
  return {
    type: 'code',
    lang: PAPYR_TABLE_FENCE,
    value: JSON.stringify(payload, null, 2),
  };
}

function excalidrawToMdast(block: ExcalidrawBlock): Code {
  const { id: _i, ...payload } = block[1];
  return {
    type: 'code',
    lang: PAPYR_EXCALIDRAW_FENCE,
    value: JSON.stringify(payload, null, 2),
  };
}

function tableRowToMdast(cells: string[]): MdTableRow {
  return {
    type: 'tableRow',
    children: cells.map(tableCellToMdast),
  };
}

function tableCellToMdast(text: string): MdTableCell {
  return {
    type: 'tableCell',
    children: text.length > 0 ? [{ type: 'text', value: text }] : [],
  };
}

function inlineToMdast(runs: Inline[]): PhrasingContent[] {
  return runs.map((run) => wrapMarks(run));
}

function wrapMarks(run: Inline): PhrasingContent {
  const marks = run.marks ?? [];
  let node: PhrasingContent = marks.includes('code')
    ? { type: 'inlineCode', value: run.text }
    : { type: 'text', value: run.text };

  if (marks.includes('italic') && node.type !== 'inlineCode') {
    node = { type: 'emphasis', children: [node] };
  }
  if (marks.includes('bold')) {
    node = { type: 'strong', children: [toPhrasing(node)] };
  }
  if (marks.includes('strike')) {
    node = { type: 'delete', children: [toPhrasing(node)] };
  }
  if (marks.includes('link') && run.href) {
    node = { type: 'link', url: run.href, children: [toPhrasing(node)] };
  }
  return node;
}

function toPhrasing(node: PhrasingContent): PhrasingContent {
  return node;
}

function canSerializeAsGfmTable(block: TableBlock, inListItem: boolean): boolean {
  const payload = block[1];
  return (
    !inListItem &&
    payload.columns.length > 0 &&
    payload.caption === undefined &&
    hasRoundTrippableColumnKeys(payload.columns) &&
    payload.columns.every(
      (column) => column.width === undefined && !containsLineBreak(column.header),
    ) &&
    payload.rows.every(
      (row) =>
        row.length === payload.columns.length &&
        row.every(
          (cell) =>
            cell.colspan === undefined &&
            cell.rowspan === undefined &&
            !containsLineBreak(cell.text),
        ),
    )
  );
}

function hasRoundTrippableColumnKeys(columns: TableColumn[]): boolean {
  const usedKeys = new Set<string>();
  return columns.every((column, index) => {
    const expected = uniqueColumnKeyFromHeader(column.header, index, usedKeys);
    return column.key === expected;
  });
}

function uniqueColumnKeyFromHeader(header: string, index: number, usedKeys: Set<string>): string {
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

function containsLineBreak(value: string): boolean {
  return /\r|\n/.test(value);
}
