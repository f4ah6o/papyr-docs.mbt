import React, { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ExcalidrawInitialDataState } from '@excalidraw/excalidraw/types/types';
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  type NodeViewProps,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { ExcalidrawBlock, MermaidBlock, PapyrDocument, TableBlock } from '@f12o/papyr-core';
import { excalidrawBlock, mermaidBlock, tableBlock } from '@f12o/papyr-core';
import {
  appendBlock,
  createBlockId,
  createDefaultExcalidrawBlock,
  createDefaultMermaidBlock,
  documentToProseMirror,
  findEmbeddedBlock,
  listEmbeddedBlocks,
  ExcalidrawBlockExtension,
  MermaidBlockExtension,
  PapyrListItemExtension,
  proseMirrorToDocument,
  sanitizeExcalidrawAppState,
  TableBlockExtension,
  updateEmbeddedBlock,
  type EmbeddedBlock,
  type ProseMirrorNode,
} from '@f12o/papyr-editor';
import { parseMarkdown, serializeDocument } from '@f12o/papyr-markdown';
import { renderDocumentPreview } from '@f12o/papyr-preview';
import {
  collectEmbeddedPreviewBlocks,
  embeddedBlockId,
  embeddedBlockType,
  getEmbeddedBlockEditorTitle,
  isEditableExcalidrawBlock,
  isEditableMermaidBlock,
  isEditableTableBlock,
  normalizeEditableTableColumns,
  type EditableEmbeddedBlock,
  type EditableEmbeddedBlockType,
} from './embedded-blocks.js';
import { shouldUseNativeTextareaFallback } from './editor-platform.js';

const ExcalidrawLazy = React.lazy(() =>
  import('@excalidraw/excalidraw').then((mod) => ({ default: mod.Excalidraw })),
);

class ExcalidrawErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override render() {
    if (this.state.failed) {
      return (
        <div className="editor-workspace__excalidraw-error">
          Excalidraw の読み込みに失敗しました。ページを再読み込みしてください。
        </div>
      );
    }
    return this.props.children;
  }
}

function TablePreviewNodeView({ node }: NodeViewProps): JSX.Element {
  const id = resolveNodeBlockId(node.attrs.id, 'table-preview');
  const data = isRecord(node.attrs.data) ? node.attrs.data : {};
  const block = useMemo<TableBlock>(
    () =>
      tableBlock({
        id,
        columns: Array.isArray(data.columns) ? (data.columns as TableBlock[1]['columns']) : [],
        rows: Array.isArray(data.rows) ? (data.rows as TableBlock[1]['rows']) : [],
        ...(typeof data.caption === 'string' && { caption: data.caption }),
      }),
    [data, id],
  );

  return (
    <EmbeddedPreviewNodeView
      block={block}
      type="table"
      label={describePreviewNode(block)}
      serializedData={JSON.stringify(block[1])}
    />
  );
}

function MermaidPreviewNodeView({ node }: NodeViewProps): JSX.Element {
  const block = useMemo<MermaidBlock>(
    () =>
      mermaidBlock({
        id: resolveNodeBlockId(node.attrs.id, 'mermaid-preview'),
        source: typeof node.attrs.source === 'string' ? node.attrs.source : '',
        ...(typeof node.attrs.caption === 'string' && { caption: node.attrs.caption }),
      }),
    [node.attrs.caption, node.attrs.id, node.attrs.source],
  );

  return (
    <EmbeddedPreviewNodeView
      block={block}
      type="mermaid"
      label={describePreviewNode(block)}
      serializedData={JSON.stringify(block[1])}
    />
  );
}

function ExcalidrawPreviewNodeView({ node }: NodeViewProps): JSX.Element {
  const id = resolveNodeBlockId(node.attrs.id, 'excalidraw-preview');
  const data = isRecord(node.attrs.data) ? node.attrs.data : {};
  const block = useMemo<ExcalidrawBlock>(
    () =>
      excalidrawBlock({
        id,
        elements: Array.isArray(data.elements)
          ? (data.elements as ExcalidrawBlock[1]['elements'])
          : [],
        ...(isRecord(data.app_state) && { app_state: data.app_state }),
        ...(isRecord(data.files) && { files: data.files }),
        ...(typeof data.caption === 'string' && { caption: data.caption }),
      }),
    [data, id],
  );

  return (
    <EmbeddedPreviewNodeView
      block={block}
      type="excalidraw"
      label={describePreviewNode(block)}
      serializedData={JSON.stringify(block[1])}
    />
  );
}

function EmbeddedPreviewNodeView({
  block,
  type,
  label,
  serializedData,
}: {
  block: EditableEmbeddedBlock;
  type: EditableEmbeddedBlockType;
  label: string;
  serializedData: string;
}): JSX.Element {
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewDoc = useMemo<PapyrDocument>(
    () => ({ id: `editor-preview-${embeddedBlockId(block)}`, blocks: [block] }),
    [block],
  );

  useEffect(() => {
    const container = previewRef.current;
    if (!container) return;
    let canceled = false;
    setPreviewError(null);
    void renderDocumentPreview(container, previewDoc).catch((error: unknown) => {
      if (canceled) return;
      setPreviewError(error instanceof Error ? error.message : 'Preview の描画に失敗しました');
    });
    return () => {
      canceled = true;
    };
  }, [previewDoc]);

  return (
    <NodeViewWrapper
      as="div"
      className="editor-workspace__embedded-node"
      data-papyr-block={type}
      data-papyr-block-id={embeddedBlockId(block)}
      data-papyr-block-type={type}
      data-papyr={serializedData}
      data-label={label}
      contentEditable={false}
    >
      <div className="editor-workspace__embedded-node-header">
        <span>{type}</span>
        <strong>{label}</strong>
      </div>
      {previewError ? (
        <div className="editor-workspace__inline-embedded-error">{previewError}</div>
      ) : (
        <div
          ref={previewRef}
          className="editor-workspace__embedded-node-preview"
          data-papyr-embedded-block-id={embeddedBlockId(block)}
          data-papyr-embedded-block-type={type}
        />
      )}
    </NodeViewWrapper>
  );
}

const FALLBACK_DOCUMENT_ID = 'papyr-editor-workspace';
const PARSE_DEBOUNCE_MS = 100;
const STATIC_EDITOR_MODE: EditorMode = 'rich';
const DOUBLE_TAP_INTERVAL_MS = 360;
const editorUiPapyrExtensions = [
  PapyrListItemExtension,
  TableBlockExtension.extend({
    addNodeView() {
      return ReactNodeViewRenderer(TablePreviewNodeView);
    },
  }),
  ExcalidrawBlockExtension.extend({
    addNodeView() {
      return ReactNodeViewRenderer(ExcalidrawPreviewNodeView);
    },
  }),
  MermaidBlockExtension.extend({
    addNodeView() {
      return ReactNodeViewRenderer(MermaidPreviewNodeView);
    },
  }),
];

export type EditorMode = 'markdown' | 'rich';

export interface EditorWorkspaceProps {
  source: string;
  onSourceChange: (next: string) => void;
  documentId?: string;
  title?: string;
  eyebrow?: string;
  subtitle?: string;
  banner?: ReactNode;
  readOnly?: boolean;
  /** @deprecated Accepted for backward compatibility but ignored; the integrated editor always uses the markdown-visible surface. */
  editorModes?: ReadonlyArray<EditorMode>;
  /** @deprecated Accepted for backward compatibility but ignored; the integrated editor always uses the markdown-visible surface. */
  initialEditorMode?: EditorMode;
  /** @deprecated Accepted for backward compatibility but ignored; the integrated editor no longer emits editor mode changes. */
  onEditorModeChange?: (next: EditorMode) => void;
  initialSelectedDiagramId?: string | null;
  onSelectedDiagramIdChange?: (next: string | null) => void;
}

export function EditorWorkspace(props: EditorWorkspaceProps): JSX.Element {
  const {
    source,
    onSourceChange,
    documentId = FALLBACK_DOCUMENT_ID,
    title,
    eyebrow,
    subtitle,
    banner,
    readOnly = false,
    initialSelectedDiagramId = null,
    onSelectedDiagramIdChange,
  } = props;

  const initialParse = useMemo(
    () => parseSource(source, documentId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [parsedDoc, setParsedDoc] = useState<PapyrDocument | null>(initialParse.doc);
  const [parseError, setParseError] = useState<string | null>(initialParse.error);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(initialSelectedDiagramId);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  const docRef = useRef<PapyrDocument | null>(initialParse.doc);
  const skipNextSourceParseRef = useRef<string | null>(source);
  const [useNativeTextareaFallback] = useState(() =>
    typeof navigator !== 'undefined'
      ? shouldUseNativeTextareaFallback({
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          maxTouchPoints: navigator.maxTouchPoints,
        })
      : false,
  );

  useEffect(() => {
    if (source === skipNextSourceParseRef.current) {
      skipNextSourceParseRef.current = null;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const next = parseSource(source, documentId);
      setParsedDoc(next.doc);
      setParseError(next.error);
      if (next.doc) docRef.current = next.doc;
    }, PARSE_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [source, documentId]);

  useEffect(() => {
    if (!parsedDoc) return;
    docRef.current = parsedDoc;
  }, [parsedDoc]);

  useEffect(() => {
    onSelectedDiagramIdChange?.(selectedBlockId);
  }, [onSelectedDiagramIdChange, selectedBlockId]);

  const embeddedBlockEntries = useMemo(
    () => (parsedDoc ? listEmbeddedBlocks(parsedDoc) : []),
    [parsedDoc],
  );
  const previewBlocks = useMemo(
    () => (parsedDoc ? collectEmbeddedPreviewBlocks(parsedDoc) : []),
    [parsedDoc],
  );
  const selectedBlock = useMemo(
    () => previewBlocks.find((block) => embeddedBlockId(block) === selectedBlockId),
    [previewBlocks, selectedBlockId],
  );

  useEffect(() => {
    if (embeddedBlockEntries.length === 0) {
      setSelectedBlockId(null);
      setIsBlockModalOpen(false);
      return;
    }
    if (!selectedBlockId || !embeddedBlockEntries.some((entry) => entry.id === selectedBlockId)) {
      setSelectedBlockId(embeddedBlockEntries[0]?.id ?? null);
    }
  }, [embeddedBlockEntries, selectedBlockId]);

  useEffect(() => {
    if (!parsedDoc) setIsBlockModalOpen(false);
  }, [parsedDoc]);

  const applySource = useCallback(
    (nextSource: string) => {
      onSourceChange(nextSource);
    },
    [onSourceChange],
  );

  const applyDocument = useCallback(
    (nextDoc: PapyrDocument, nextSelectionId?: string | null) => {
      docRef.current = nextDoc;
      setParsedDoc(nextDoc);
      setParseError(null);
      const nextSource = serializeDocument(nextDoc);
      skipNextSourceParseRef.current = nextSource;
      onSourceChange(nextSource);
      if (nextSelectionId !== undefined) setSelectedBlockId(nextSelectionId);
    },
    [onSourceChange],
  );

  const openBlockEditor = useCallback((blockId: string) => {
    setSelectedBlockId(blockId);
    setIsBlockModalOpen(true);
  }, []);

  const closeBlockEditor = useCallback(() => {
    setIsBlockModalOpen(false);
  }, []);

  const addMermaid = () => {
    if (!parsedDoc) return;
    const block = createDefaultMermaidBlock();
    applyDocument(appendBlock(parsedDoc, block), embeddedBlockId(block));
    setIsBlockModalOpen(true);
  };

  const addExcalidraw = () => {
    if (!parsedDoc) return;
    const block = createDefaultExcalidrawBlock();
    applyDocument(appendBlock(parsedDoc, block), embeddedBlockId(block));
    setIsBlockModalOpen(true);
  };

  const updateMermaid = (patch: Partial<MermaidBlock[1]>) => {
    const current = docRef.current;
    if (!current || !isEditableMermaidBlock(selectedBlock)) return;
    const selectedId = embeddedBlockId(selectedBlock);
    const nextDoc = updateEmbeddedBlock(current, selectedId, (block) =>
      isEditableMermaidBlock(block) ? mermaidBlock({ ...block[1], ...patch }) : block,
    );
    applyDocument(nextDoc, selectedId);
  };

  const updateExcalidrawCaption = (caption: string | undefined) => {
    const current = docRef.current;
    if (!current || !isEditableExcalidrawBlock(selectedBlock)) return;
    const selectedId = embeddedBlockId(selectedBlock);
    const nextDoc = updateEmbeddedBlock(current, selectedId, (block) =>
      isEditableExcalidrawBlock(block)
        ? excalidrawBlock({ ...block[1], caption: caption ?? undefined })
        : block,
    );
    applyDocument(nextDoc, selectedId);
  };

  const updateTable = useCallback(
    (updater: (block: TableBlock) => TableBlock) => {
      const current = docRef.current;
      if (!current || !isEditableTableBlock(selectedBlock)) return;
      const selectedId = embeddedBlockId(selectedBlock);
      const nextDoc = updateEmbeddedBlock(current, selectedId, (block) =>
        isEditableTableBlock(block) ? updater(block) : block,
      );
      applyDocument(nextDoc, selectedId);
    },
    [applyDocument, selectedBlock],
  );

  const updateTableCaption = useCallback(
    (caption: string | undefined) => {
      updateTable((block) =>
        tableBlock({
          ...block[1],
          caption: caption ?? undefined,
        }),
      );
    },
    [updateTable],
  );

  const updateTableHeader = useCallback(
    (columnIndex: number, header: string) => {
      updateTable((block) =>
        tableBlock({
          ...block[1],
          columns: normalizeEditableTableColumns(
            block[1].columns.map((column, index) =>
              index === columnIndex ? { ...column, header } : column,
            ),
          ),
        }),
      );
    },
    [updateTable],
  );

  const updateTableCell = useCallback(
    (rowIndex: number, columnIndex: number, text: string) => {
      updateTable((block) =>
        tableBlock({
          ...block[1],
          rows: block[1].rows.map((row, index) =>
            index === rowIndex
              ? Array.from({ length: block[1].columns.length }, (_, currentColumnIndex) => {
                  const cell = row[currentColumnIndex] ?? { text: '' };
                  return currentColumnIndex === columnIndex ? { ...cell, text } : cell;
                })
              : row,
          ),
        }),
      );
    },
    [updateTable],
  );

  const addTableColumn = useCallback(() => {
    updateTable((block) =>
      tableBlock({
        ...block[1],
        columns: normalizeEditableTableColumns([
          ...block[1].columns,
          {
            key: '',
            header: `Column ${block[1].columns.length + 1}`,
          },
        ]),
        rows: block[1].rows.map((row) => [...row, { text: '' }]),
      }),
    );
  }, [updateTable]);

  const removeTableColumn = useCallback(
    (columnIndex: number) => {
      updateTable((block) => {
        if (block[1].columns.length <= 1) return block;
        return tableBlock({
          ...block[1],
          columns: normalizeEditableTableColumns(
            block[1].columns.filter((_, index) => index !== columnIndex),
          ),
          rows: block[1].rows.map((row) => row.filter((_, index) => index !== columnIndex)),
        });
      });
    },
    [updateTable],
  );

  const addTableRow = useCallback(() => {
    updateTable((block) =>
      tableBlock({
        ...block[1],
        rows: [...block[1].rows, createEmptyTableRow(block[1].columns.length)],
      }),
    );
  }, [updateTable]);

  const removeTableRow = useCallback(
    (rowIndex: number) => {
      updateTable((block) =>
        tableBlock({
          ...block[1],
          rows: block[1].rows.filter((_, index) => index !== rowIndex),
        }),
      );
    },
    [updateTable],
  );

  const selectedExcalidrawId = isEditableExcalidrawBlock(selectedBlock)
    ? embeddedBlockId(selectedBlock)
    : null;

  const excalidrawInitialData = useMemo<ExcalidrawInitialDataState | undefined>(() => {
    if (!selectedExcalidrawId || !parsedDoc) return undefined;
    const block = findEmbeddedBlock(parsedDoc, selectedExcalidrawId);
    if (!isEditableExcalidrawBlock(block)) return undefined;
    return toExcalidrawInitialData(block);
  }, [parsedDoc, selectedExcalidrawId]);

  const handleExcalidrawChange = useCallback(
    (elements: readonly unknown[], appState: unknown, files: unknown) => {
      const id = selectedExcalidrawId;
      const current = docRef.current;
      if (!id || !current) return;
      const block = findEmbeddedBlock(current, id);
      if (!isEditableExcalidrawBlock(block)) return;
      const nextElements = toPlainRecordArray(elements);
      const nextAppState = sanitizeExcalidrawAppState(appState);
      const nextFiles = toPlainRecord(files);
      if (
        recordArrayEqual(block[1].elements as Array<Record<string, unknown>>, nextElements) &&
        recordEqual(block[1].app_state, nextAppState) &&
        recordEqual(block[1].files, nextFiles)
      ) {
        return;
      }
      const nextDoc = updateEmbeddedBlock(current, id, (candidate) =>
        isEditableExcalidrawBlock(candidate)
          ? excalidrawBlock({
              ...candidate[1],
              elements: nextElements,
              app_state: nextAppState,
              files: nextFiles,
            })
          : candidate,
      );
      applyDocument(nextDoc, id);
    },
    [applyDocument, selectedExcalidrawId],
  );

  const blockActionsDisabled = readOnly || parsedDoc === null || parseError !== null;
  const blockCount = parsedDoc?.blocks.length ?? 0;

  return (
    <div className="editor-workspace" data-editor-mode={STATIC_EDITOR_MODE}>
      <header className="editor-workspace__topbar">
        <div>
          {eyebrow ? <p className="editor-workspace__eyebrow">{eyebrow}</p> : null}
          {title ? <h1 className="editor-workspace__title">{title}</h1> : null}
          {subtitle ? <p className="editor-workspace__subtitle">{subtitle}</p> : null}
        </div>
        <div className="editor-workspace__actions">
          <button
            type="button"
            className="editor-workspace__action"
            onClick={addMermaid}
            disabled={blockActionsDisabled}
          >
            Add Mermaid
          </button>
          <button
            type="button"
            className="editor-workspace__action"
            onClick={addExcalidraw}
            disabled={blockActionsDisabled}
          >
            Add Excalidraw
          </button>
        </div>
      </header>

      {banner}

      <div className="editor-workspace__summary-strip">
        <span>Visual blocks edit the PapyrDocument while Markdown stays the public API.</span>
        <span>{blockCount} blocks</span>
        <span>{embeddedBlockEntries.length} embedded blocks</span>
      </div>

      {parseError ? (
        <div className="editor-workspace__banner editor-workspace__banner--error">
          Markdown を PapyrDocument に変換できません。embedded preview と block editor
          は一時停止しています: {parseError}
        </div>
      ) : null}

      <main className="editor-workspace__layout">
        <section className="editor-workspace__panel editor-workspace__panel--workspace">
          <div className="editor-workspace__panel-header">
            <div className="editor-workspace__panel-heading">
              <h2>Integrated editor</h2>
              <span>TipTap edits structured blocks and serializes changes back to Markdown.</span>
            </div>
          </div>

          {parsedDoc && !parseError && !useNativeTextareaFallback ? (
            <RichProseMirrorEditor
              doc={parsedDoc}
              documentId={documentId}
              selectedBlockId={selectedBlockId}
              readOnly={readOnly}
              onDocumentChange={applyDocument}
              onSelectEmbeddedBlock={setSelectedBlockId}
              onOpenEmbeddedBlock={openBlockEditor}
            />
          ) : (
            <SourceRecoveryEditor
              source={source}
              readOnly={readOnly}
              onSourceChange={applySource}
            />
          )}

          <div className="editor-workspace__editor-footer">
            <span>
              Embedded blocks remain atomic and open focused editors with double-click, double-tap,
              or the toolbar action.
            </span>
          </div>
        </section>
      </main>

      <BlockEditorModal
        open={isBlockModalOpen && !!selectedBlock && !readOnly && !parseError}
        block={selectedBlock}
        onClose={closeBlockEditor}
        onUpdateMermaid={updateMermaid}
        onUpdateTableCaption={updateTableCaption}
        onUpdateTableHeader={updateTableHeader}
        onUpdateTableCell={updateTableCell}
        onAddTableColumn={addTableColumn}
        onRemoveTableColumn={removeTableColumn}
        onAddTableRow={addTableRow}
        onRemoveTableRow={removeTableRow}
        onUpdateExcalidrawCaption={updateExcalidrawCaption}
        excalidrawInitialData={excalidrawInitialData}
        onExcalidrawChange={handleExcalidrawChange}
      />
    </div>
  );
}

function RichProseMirrorEditor({
  doc,
  documentId,
  selectedBlockId,
  readOnly,
  onDocumentChange,
  onSelectEmbeddedBlock,
  onOpenEmbeddedBlock,
}: {
  doc: PapyrDocument;
  documentId: string;
  selectedBlockId: string | null;
  readOnly: boolean;
  onDocumentChange: (nextDoc: PapyrDocument, nextSelectionId?: string | null) => void;
  onSelectEmbeddedBlock: (blockId: string) => void;
  onOpenEmbeddedBlock: (blockId: string) => void;
}) {
  const lastExternalDocRef = useRef<PapyrDocument>(doc);
  const lastTouchTapRef = useRef<{ id: string; time: number } | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        listItem: false,
      }),
      ...editorUiPapyrExtensions,
    ],
    content: documentToProseMirror(doc),
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'editor-workspace__prosemirror',
        'aria-label': 'Papyr visual block editor',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const pm = currentEditor.getJSON() as ProseMirrorNode;
      const converted = proseMirrorToDocument(pm, documentId, {
        generateId: () => createBlockId('block'),
      });
      const base = lastExternalDocRef.current;
      onDocumentChange({
        ...converted,
        title: base.title,
        meta: base.meta,
      });
    },
  });

  useEffect(() => {
    lastExternalDocRef.current = doc;
    if (!editor) return;
    const nextContent = documentToProseMirror(doc);
    if (JSON.stringify(editor.getJSON()) === JSON.stringify(nextContent)) return;
    editor.commands.setContent(nextContent, false);
  }, [doc, editor]);

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor) return;
    const root = editor.view.dom;
    const blocks = root.querySelectorAll<HTMLElement>('[data-papyr-block-id]');
    for (const block of blocks) {
      block.classList.toggle('is-active', block.dataset.papyrBlockId === selectedBlockId);
    }
  }, [editor, selectedBlockId, doc]);

  const editSelectedBlock = useCallback(() => {
    if (selectedBlockId && !readOnly) onOpenEmbeddedBlock(selectedBlockId);
  }, [onOpenEmbeddedBlock, readOnly, selectedBlockId]);

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== 'touch') return;
      const blockId = getEditorEmbeddedBlockId(event.target);
      if (!blockId) return;
      onSelectEmbeddedBlock(blockId);
      if (readOnly) return;
      const now = Date.now();
      const lastTap = lastTouchTapRef.current;
      if (lastTap && lastTap.id === blockId && now - lastTap.time <= DOUBLE_TAP_INTERVAL_MS) {
        onOpenEmbeddedBlock(blockId);
        lastTouchTapRef.current = null;
        return;
      }
      lastTouchTapRef.current = { id: blockId, time: now };
    },
    [onOpenEmbeddedBlock, onSelectEmbeddedBlock, readOnly],
  );

  return (
    <>
      <div className="editor-workspace__toolbar" role="toolbar" aria-label="Block editor toolbar">
        <ToolbarButton
          label="Paragraph"
          active={editor?.isActive('paragraph') ?? false}
          disabled={readOnly || !editor}
          onClick={() => {
            editor?.chain().focus().setParagraph().run();
          }}
        />
        <ToolbarButton
          label="H1"
          active={editor?.isActive('heading', { level: 1 }) ?? false}
          disabled={readOnly || !editor}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
        />
        <ToolbarButton
          label="H2"
          active={editor?.isActive('heading', { level: 2 }) ?? false}
          disabled={readOnly || !editor}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          label="Bold"
          active={editor?.isActive('bold') ?? false}
          disabled={readOnly || !editor}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          label="Italic"
          active={editor?.isActive('italic') ?? false}
          disabled={readOnly || !editor}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          label="Strike"
          active={editor?.isActive('strike') ?? false}
          disabled={readOnly || !editor}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        />
        <ToolbarButton
          label="Code block"
          active={editor?.isActive('codeBlock') ?? false}
          disabled={readOnly || !editor}
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        />
        <ToolbarButton
          label="Edit block"
          active={false}
          disabled={readOnly || !selectedBlockId}
          onClick={editSelectedBlock}
        />
      </div>
      <div
        className="editor-workspace__rich-shell"
        onClick={(event) => {
          const blockId = getEditorEmbeddedBlockId(event.target);
          if (blockId) onSelectEmbeddedBlock(blockId);
        }}
        onDoubleClick={(event) => {
          const blockId = getEditorEmbeddedBlockId(event.target);
          if (!blockId || readOnly) return;
          onSelectEmbeddedBlock(blockId);
          onOpenEmbeddedBlock(blockId);
        }}
        onPointerUp={handlePointerUp}
      >
        <EditorContent editor={editor} />
      </div>
    </>
  );
}

function SourceRecoveryEditor({
  source,
  readOnly,
  onSourceChange,
}: {
  source: string;
  readOnly: boolean;
  onSourceChange: (next: string) => void;
}) {
  return (
    <div className="editor-workspace__source-recovery">
      <label>
        <span>Markdown source recovery</span>
        <textarea
          className="editor-workspace__markdown editor-workspace__markdown--recovery"
          spellCheck={false}
          value={source}
          readOnly={readOnly}
          onChange={(event) => onSourceChange(event.target.value)}
        />
      </label>
    </div>
  );
}

function BlockEditorModal({
  open,
  block,
  onClose,
  onUpdateMermaid,
  onUpdateTableCaption,
  onUpdateTableHeader,
  onUpdateTableCell,
  onAddTableColumn,
  onRemoveTableColumn,
  onAddTableRow,
  onRemoveTableRow,
  onUpdateExcalidrawCaption,
  excalidrawInitialData,
  onExcalidrawChange,
}: {
  open: boolean;
  block: EmbeddedBlock | undefined;
  onClose: () => void;
  onUpdateMermaid: (patch: Partial<MermaidBlock[1]>) => void;
  onUpdateTableCaption: (caption: string | undefined) => void;
  onUpdateTableHeader: (columnIndex: number, header: string) => void;
  onUpdateTableCell: (rowIndex: number, columnIndex: number, text: string) => void;
  onAddTableColumn: () => void;
  onRemoveTableColumn: (columnIndex: number) => void;
  onAddTableRow: () => void;
  onRemoveTableRow: (rowIndex: number) => void;
  onUpdateExcalidrawCaption: (caption: string | undefined) => void;
  excalidrawInitialData: ExcalidrawInitialDataState | undefined;
  onExcalidrawChange: (elements: readonly unknown[], appState: unknown, files: unknown) => void;
}) {
  const mermaidPreviewRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement | null>(
    null,
  );
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [mermaidPreviewError, setMermaidPreviewError] = useState<string | null>(null);

  const setInitialFocusTarget = useCallback(
    (element: HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement | null) => {
      initialFocusRef.current = element;
    },
    [],
  );

  useEffect(() => {
    if (!open || !isEditableMermaidBlock(block)) return;
    const container = mermaidPreviewRef.current;
    if (!container) return;
    let canceled = false;
    setMermaidPreviewError(null);
    const previewDoc: PapyrDocument = { id: `preview-${embeddedBlockId(block)}`, blocks: [block] };
    void renderDocumentPreview(container, previewDoc).catch((error: unknown) => {
      if (canceled) return;
      setMermaidPreviewError(
        error instanceof Error ? error.message : 'Mermaid preview の描画に失敗しました',
      );
    });
    return () => {
      canceled = true;
    };
  }, [block, open]);

  useEffect(() => {
    if (!open) {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
      return;
    }
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const raf = window.requestAnimationFrame(() => initialFocusRef.current?.focus());
    return () => window.cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const modal = modalRef.current;
      if (!modal) return;
      const focusable = getFocusableElements(modal);
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const activeElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (!activeElement || !modal.contains(activeElement)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  if (!open || !block) return null;
  const blockType = embeddedBlockType(block);
  const blockEditorTitle = getEmbeddedBlockEditorTitle(blockType);

  return (
    <div
      className="editor-workspace__modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="editor-workspace__modal"
        role="dialog"
        aria-modal="true"
        aria-label={blockEditorTitle}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="editor-workspace__modal-header">
          <div>
            <p className="editor-workspace__modal-eyebrow">{blockType}</p>
            <h2>{blockEditorTitle}</h2>
          </div>
          <button
            ref={isEditableExcalidrawBlock(block) ? setInitialFocusTarget : undefined}
            type="button"
            className="editor-workspace__modal-close"
            aria-label="Close block editor"
            onClick={onClose}
          >
            Close
          </button>
        </header>

        {isEditableMermaidBlock(block) ? (
          <div className="editor-workspace__modal-layout editor-workspace__modal-layout--split">
            <label className="editor-workspace__modal-field">
              <span>Caption</span>
              <input
                ref={setInitialFocusTarget}
                type="text"
                value={block[1].caption ?? ''}
                onChange={(event) =>
                  onUpdateMermaid({
                    caption: event.target.value || undefined,
                  })
                }
              />
            </label>
            <div className="editor-workspace__modal-mermaid">
              <label className="editor-workspace__modal-field">
                <span>Source</span>
                <textarea
                  className="editor-workspace__mermaid-source"
                  spellCheck={false}
                  value={block[1].source}
                  onChange={(event) =>
                    onUpdateMermaid({
                      source: event.target.value,
                    })
                  }
                />
              </label>
              <section className="editor-workspace__modal-preview-card">
                <div className="editor-workspace__modal-preview-header">
                  <h3>Preview</h3>
                  <span>Rendered from the same Markdown block</span>
                </div>
                {mermaidPreviewError ? (
                  <div className="editor-workspace__banner editor-workspace__banner--error">
                    {mermaidPreviewError}
                  </div>
                ) : null}
                <div ref={mermaidPreviewRef} className="editor-workspace__modal-preview-body" />
              </section>
            </div>
          </div>
        ) : isEditableTableBlock(block) ? (
          <div className="editor-workspace__modal-layout editor-workspace__modal-layout--split">
            <label className="editor-workspace__modal-field">
              <span>Caption</span>
              <input
                ref={setInitialFocusTarget}
                type="text"
                value={block[1].caption ?? ''}
                onChange={(event) => onUpdateTableCaption(event.target.value || undefined)}
              />
            </label>
            <div className="editor-workspace__modal-table">
              <section className="editor-workspace__modal-preview-card">
                <div className="editor-workspace__modal-preview-header">
                  <h3>Columns</h3>
                  <button
                    type="button"
                    className="editor-workspace__toolbar-button"
                    onClick={onAddTableColumn}
                  >
                    Add column
                  </button>
                </div>
                <div className="editor-workspace__modal-table-section">
                  {block[1].columns.map((column, columnIndex) => (
                    <div
                      key={`${embeddedBlockId(block)}-column-${columnIndex}`}
                      className="editor-workspace__modal-table-column"
                    >
                      <label className="editor-workspace__modal-field">
                        <span>Header {columnIndex + 1}</span>
                        <input
                          type="text"
                          value={column.header}
                          onChange={(event) => onUpdateTableHeader(columnIndex, event.target.value)}
                        />
                      </label>
                      <button
                        type="button"
                        className="editor-workspace__toolbar-button"
                        onClick={() => onRemoveTableColumn(columnIndex)}
                        disabled={block[1].columns.length <= 1}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="editor-workspace__modal-preview-card">
                <div className="editor-workspace__modal-preview-header">
                  <h3>Rows</h3>
                  <button
                    type="button"
                    className="editor-workspace__toolbar-button"
                    onClick={onAddTableRow}
                  >
                    Add row
                  </button>
                </div>
                <div className="editor-workspace__modal-table-section">
                  {block[1].rows.length === 0 ? (
                    <div className="editor-workspace__empty">
                      No rows yet. Add one to start editing table data.
                    </div>
                  ) : (
                    block[1].rows.map((row, rowIndex) => (
                      <div
                        key={`${embeddedBlockId(block)}-row-${rowIndex}`}
                        className="editor-workspace__modal-table-row"
                      >
                        <div className="editor-workspace__modal-table-grid">
                          {block[1].columns.map((column, columnIndex) => (
                            <label
                              key={`${embeddedBlockId(block)}-row-${rowIndex}-cell-${columnIndex}`}
                              className="editor-workspace__modal-field"
                            >
                              <span>{column.header || `Column ${columnIndex + 1}`}</span>
                              <input
                                type="text"
                                value={row[columnIndex]?.text ?? ''}
                                onChange={(event) =>
                                  onUpdateTableCell(rowIndex, columnIndex, event.target.value)
                                }
                              />
                            </label>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="editor-workspace__toolbar-button"
                          onClick={() => onRemoveTableRow(rowIndex)}
                        >
                          Remove row
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div className="editor-workspace__modal-layout">
            <label className="editor-workspace__modal-field">
              <span>Caption</span>
              <input
                ref={setInitialFocusTarget}
                type="text"
                value={block[1].caption ?? ''}
                onChange={(event) => onUpdateExcalidrawCaption(event.target.value || undefined)}
              />
            </label>
            <div className="editor-workspace__excalidraw editor-workspace__excalidraw--modal">
              <ExcalidrawErrorBoundary>
                <React.Suspense fallback={<div className="editor-workspace__excalidraw-loading" />}>
                  <ExcalidrawLazy
                    key={embeddedBlockId(block)}
                    initialData={excalidrawInitialData}
                    onChange={onExcalidrawChange}
                    UIOptions={{
                      canvasActions: {
                        loadScene: false,
                        saveAsImage: true,
                        export: false,
                        toggleTheme: false,
                      },
                    }}
                  />
                </React.Suspense>
              </ExcalidrawErrorBoundary>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({
  active,
  disabled,
  label,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={
        active ? 'editor-workspace__toolbar-button is-active' : 'editor-workspace__toolbar-button'
      }
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function parseSource(
  source: string,
  documentId: string,
): { doc: PapyrDocument | null; error: string | null } {
  try {
    return {
      doc: parseMarkdown(source, {
        documentId,
        generateId: () => createBlockId('block'),
      }),
      error: null,
    };
  } catch (error) {
    return {
      doc: null,
      error: error instanceof Error ? error.message : 'Markdown の解析に失敗しました',
    };
  }
}

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => !element.hasAttribute('disabled') && element.tabIndex >= 0);
}

function getEditorEmbeddedBlockId(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLElement>('[data-papyr-block-id]')?.dataset.papyrBlockId ?? null;
}

function createEmptyTableRow(columnCount: number): TableBlock[1]['rows'][number] {
  return Array.from({ length: columnCount }, () => ({ text: '' }));
}

function toExcalidrawInitialData(block: ExcalidrawBlock): ExcalidrawInitialDataState {
  const appState = sanitizeExcalidrawAppState(block[1].app_state);
  return {
    elements: cloneJson(block[1].elements) as unknown as ExcalidrawInitialDataState['elements'],
    ...(appState !== undefined && {
      appState: {
        ...cloneJson(appState),
        collaborators: new Map<string, never>(),
      } as ExcalidrawInitialDataState['appState'],
    }),
    ...(block[1].files !== undefined && {
      files: cloneJson(block[1].files) as ExcalidrawInitialDataState['files'],
    }),
  };
}

function resolveNodeBlockId(value: unknown, fallbackPrefix: string): string {
  return typeof value === 'string' && value.length > 0 ? value : createBlockId(fallbackPrefix);
}

function describePreviewNode(block: EditableEmbeddedBlock): string {
  switch (block[0]) {
    case 'Table':
      return block[1].caption || `Table (${block[1].columns.length} columns)`;
    case 'Mermaid': {
      if (block[1].caption) return block[1].caption;
      return (
        block[1].source
          .split('\n')
          .map((line) => line.trim())
          .find((line) => line.length > 0) ?? 'Mermaid diagram'
      );
    }
    case 'Excalidraw':
      return block[1].caption || `Excalidraw (${block[1].elements.length} elements)`;
    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
}

function toPlainRecordArray(values: readonly unknown[]): Array<Record<string, unknown>> {
  return values.map((value) => toPlainRecord(value));
}

function toPlainRecord(value: unknown): Record<string, unknown> {
  const cloned = cloneJson(value);
  return isRecord(cloned) ? cloned : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function recordArrayEqual(
  a: ReadonlyArray<Record<string, unknown>> | undefined,
  b: ReadonlyArray<Record<string, unknown>> | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index++) {
    if (!recordEqual(a[index], b[index])) return false;
  }
  return true;
}

function recordEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return a === b;
  return JSON.stringify(a) === JSON.stringify(b);
}
