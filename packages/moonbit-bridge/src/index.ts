import {
  papyr_collect_document_headings_json,
  papyr_document_plain_text_json,
  papyr_document_title_json,
  papyr_document_tool_json,
  papyr_insert_document_block_after_json,
  papyr_parse_markdown_json,
  papyr_relation_build_publication_tree_state_json,
  papyr_relation_check_json,
  papyr_relation_dedupe_raw_json,
  papyr_relation_dedupe_resolved_json,
  papyr_relation_format_diagnostic_json,
  papyr_relation_list_chapter_ids_for_book_json,
  papyr_relation_project_backlinks_json,
  papyr_relation_project_graph_json,
  papyr_relation_project_tree_json,
  papyr_relation_resolve_json,
  papyr_relation_sort_raw_json,
  papyr_relation_sort_resolved_json,
  papyr_remove_document_block_json,
  papyr_replace_document_block_json,
  papyr_resolve_pdf_layout_json,
  papyr_serialize_document_json,
  papyr_search_block_text_json,
  papyr_search_extract_snippet_json,
  papyr_search_to_indexable_json,
  papyr_validate_document_json,
  papyr_visit_document_blocks_json,
} from './generated/bridge.js';

export interface MoonBitDiagnostic {
  kind: string;
  code: string;
  path: string;
  message: string;
  expected?: string;
  received?: string;
}

export interface DocumentEnvelope<TDocument = unknown> {
  ok: boolean;
  tool: string;
  document?: TDocument;
  diagnostics: MoonBitDiagnostic[];
}

export interface MarkdownEnvelope {
  ok: boolean;
  tool: string;
  markdown: string;
  diagnostics: MoonBitDiagnostic[];
}

export interface DocumentStackEnvelope<TResult = unknown> {
  ok: boolean;
  tool: string;
  result?: TResult;
  diagnostics: MoonBitDiagnostic[];
}

export type BridgeResultEnvelope<TResult = unknown> = DocumentStackEnvelope<TResult>;

export interface PdfLayoutResolveInput<TDocument = unknown, TData = unknown> {
  document: TDocument;
  data?: TData;
  mode?: string;
}

export interface PdfLayoutResolveEnvelope<TPage = unknown> {
  ok: boolean;
  tool: string;
  /** Matches the MoonBit JSON wire format. */
  document_id: string;
  mode: string;
  pages: TPage[];
  diagnostics: MoonBitDiagnostic[];
}

function parseEnvelope<T>(source: string): T {
  return JSON.parse(source) as T;
}

export function validateDocumentJson<TDocument = unknown>(
  document: unknown,
): DocumentEnvelope<TDocument> {
  return parseEnvelope(papyr_validate_document_json(JSON.stringify(document)));
}

function parseBridgeResult<TResult>(source: string): TResult {
  const envelope = parseEnvelope<BridgeResultEnvelope<TResult>>(source);
  if (!envelope.ok || envelope.result === undefined) {
    const message = envelope.diagnostics[0]?.message ?? `${envelope.tool} failed`;
    throw new Error(message);
  }
  return envelope.result;
}

export function documentTitleJson(document: unknown): string {
  return parseBridgeResult(papyr_document_title_json(JSON.stringify({ document })));
}

export function documentPlainTextJson(document: unknown): string {
  return parseBridgeResult(papyr_document_plain_text_json(JSON.stringify({ document })));
}

export function searchBlockTextJson(block: unknown): string {
  return parseBridgeResult(papyr_search_block_text_json(JSON.stringify({ block })));
}

export function searchToIndexableJson<TIndexable = unknown>(document: unknown): TIndexable {
  return parseBridgeResult(papyr_search_to_indexable_json(JSON.stringify({ document })));
}

export function searchExtractSnippetJson(
  text: string,
  query: string,
  context?: number,
): string | null {
  const result = parseBridgeResult<{ snippet?: string | null }>(
    papyr_search_extract_snippet_json(JSON.stringify({ text, query, context })),
  );
  return result.snippet ?? null;
}

export function collectDocumentHeadingsJson<THeading = unknown>(document: unknown): THeading[] {
  return parseBridgeResult(papyr_collect_document_headings_json(JSON.stringify({ document })));
}

export function visitDocumentBlocksJson<TVisit = unknown>(document: unknown): TVisit[] {
  return parseBridgeResult(papyr_visit_document_blocks_json(JSON.stringify({ document })));
}

export function replaceDocumentBlockJson<TDocument = unknown>(
  document: unknown,
  blockId: string,
  block: unknown,
): TDocument {
  return parseBridgeResult(
    papyr_replace_document_block_json(JSON.stringify({ document, block_id: blockId, block })),
  );
}

export function insertDocumentBlockAfterJson<TDocument = unknown>(
  document: unknown,
  blockId: string,
  block: unknown,
): TDocument {
  return parseBridgeResult(
    papyr_insert_document_block_after_json(JSON.stringify({ document, block_id: blockId, block })),
  );
}

export function removeDocumentBlockJson<TDocument = unknown>(
  document: unknown,
  blockId: string,
): TDocument {
  return parseBridgeResult(
    papyr_remove_document_block_json(JSON.stringify({ document, block_id: blockId })),
  );
}

export function parseMarkdownJson<TDocument = unknown>(
  markdown: string,
  id = 'untitled',
): DocumentEnvelope<TDocument> {
  return parseEnvelope(papyr_parse_markdown_json(JSON.stringify({ markdown, id })));
}

export function serializeDocumentJson(document: unknown): MarkdownEnvelope {
  return parseEnvelope(papyr_serialize_document_json(JSON.stringify(document)));
}

export function documentToolJson<TResult = unknown>(
  tool: string,
  input: unknown,
): DocumentStackEnvelope<TResult> {
  return parseEnvelope(papyr_document_tool_json(JSON.stringify({ tool, input })));
}

export function resolvePdfLayoutJson<TPage = unknown>(
  input: PdfLayoutResolveInput,
): PdfLayoutResolveEnvelope<TPage> {
  return parseEnvelope(papyr_resolve_pdf_layout_json(JSON.stringify(input)));
}

function parseRelationResult<TResult>(source: string): TResult {
  const result = parseEnvelope<TResult>(source);
  if (typeof result === 'string') {
    throw new Error(result);
  }
  return result;
}

export function relationSortRawJson<TRelation = unknown>(relations: readonly unknown[]): TRelation[] {
  return parseRelationResult(papyr_relation_sort_raw_json(JSON.stringify(relations)));
}

export function relationSortResolvedJson<TRelation = unknown>(
  relations: readonly unknown[],
): TRelation[] {
  return parseRelationResult(papyr_relation_sort_resolved_json(JSON.stringify(relations)));
}

export function relationDedupeRawJson<TRelation = unknown>(
  relations: readonly unknown[],
): TRelation[] {
  return parseRelationResult(papyr_relation_dedupe_raw_json(JSON.stringify(relations)));
}

export function relationDedupeResolvedJson<TRelation = unknown>(
  relations: readonly unknown[],
): TRelation[] {
  return parseRelationResult(papyr_relation_dedupe_resolved_json(JSON.stringify(relations)));
}

export function relationCheckJson<TResult = unknown>(input: unknown): TResult {
  return parseRelationResult(papyr_relation_check_json(JSON.stringify(input)));
}

export function relationResolveJson<TResult = unknown>(input: unknown): TResult {
  return parseRelationResult(papyr_relation_resolve_json(JSON.stringify(input)));
}

export function relationProjectTreeJson<TResult = unknown>(input: unknown): TResult {
  return parseRelationResult(papyr_relation_project_tree_json(JSON.stringify(input)));
}

export function relationProjectBacklinksJson<TResult = unknown>(input: unknown): TResult {
  return parseRelationResult(papyr_relation_project_backlinks_json(JSON.stringify(input)));
}

export function relationProjectGraphJson<TResult = unknown>(relations: readonly unknown[]): TResult {
  return parseRelationResult(papyr_relation_project_graph_json(JSON.stringify(relations)));
}

export function relationBuildPublicationTreeStateJson<TResult = unknown>(input: unknown): TResult {
  return parseRelationResult(papyr_relation_build_publication_tree_state_json(JSON.stringify(input)));
}

export function relationListChapterIdsForBookJson(
  bookId: string,
  state: unknown,
): string[] {
  return parseRelationResult(
    papyr_relation_list_chapter_ids_for_book_json(JSON.stringify({ book_id: bookId, state })),
  );
}

export function relationFormatDiagnosticJson(diagnostic: unknown): string {
  return parseEnvelope<string>(papyr_relation_format_diagnostic_json(JSON.stringify(diagnostic)));
}
