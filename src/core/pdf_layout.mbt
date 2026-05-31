///|
pub(all) struct PdfRect {
  x : Int
  y : Int
  width : Int
  height : Int
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfPageSize {
  width : Int
  height : Int
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfColor {
  red : Int
  green : Int
  blue : Int
  alpha : Int
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) enum PdfTextAlign {
  PdfTextAlignLeft
  PdfTextAlignCenter
  PdfTextAlignRight
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfTextStyle {
  font_family : String
  font_size : Int
  color : PdfColor
  align : PdfTextAlign
  bold : Bool
  italic : Bool
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) enum PdfImageFit {
  PdfImageFitContain
  PdfImageFitCover
  PdfImageFitFill
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) enum PdfShapeKind {
  PdfShapeRectangle
  PdfShapeLine
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfShapeStyle {
  fill : PdfColor?
  stroke : PdfColor?
  stroke_width : Int
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) enum PdfTextSource {
  PdfFixedText(String)
  PdfBoundText(String)
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) enum PdfImageSource {
  PdfFixedImage(String)
  PdfBoundImage(String)
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfTableColumn {
  key : String
  header : String
  width : Int?
  align : PdfTextAlign
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfDataTableColumn {
  key : String
  header : String
  field_key : String
  width : Int?
  align : PdfTextAlign
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfNodeFrame {
  id : String
  rect : PdfRect
  visible_when : PdfConditionGroup?
  locked : Bool
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfTextNode {
  frame : PdfNodeFrame
  source : PdfTextSource
  style : PdfTextStyle
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfImageNode {
  frame : PdfNodeFrame
  source : PdfImageSource
  alt : PdfTextSource?
  fit : PdfImageFit
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfStaticTableNode {
  frame : PdfNodeFrame
  columns : Array[PdfTableColumn]
  rows : Array[Array[PdfTextSource]]
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfDataTableNode {
  frame : PdfNodeFrame
  collection_key : String
  columns : Array[PdfDataTableColumn]
  empty_text : String
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfShapeNode {
  frame : PdfNodeFrame
  kind : PdfShapeKind
  style : PdfShapeStyle
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfGroupNode {
  frame : PdfNodeFrame
  children : Array[PdfLayoutNode]
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) enum PdfLayoutNode {
  PdfLayoutText(PdfTextNode)
  PdfLayoutImage(PdfImageNode)
  PdfLayoutStaticTable(PdfStaticTableNode)
  PdfLayoutDataTable(PdfDataTableNode)
  PdfLayoutShape(PdfShapeNode)
  PdfLayoutGroup(PdfGroupNode)
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfLayoutPage {
  id : String
  size : PdfPageSize
  nodes : Array[PdfLayoutNode]
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfLayoutPages {
  first : PdfLayoutPage
  rest : Array[PdfLayoutPage]
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfLayoutDocument {
  id : String
  title : String
  pages : PdfLayoutPages
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfTextBinding {
  key : String
  value : String
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfImageBinding {
  key : String
  url : String
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfNumberBinding {
  key : String
  value : Int
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfBoolBinding {
  key : String
  value : Bool
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfDataRow {
  cells : Array[PdfTextBinding]
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfDataListBinding {
  key : String
  rows : Array[PdfDataRow]
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfLayoutData {
  text_values : Array[PdfTextBinding]
  image_values : Array[PdfImageBinding]
  number_values : Array[PdfNumberBinding]
  bool_values : Array[PdfBoolBinding]
  data_lists : Array[PdfDataListBinding]
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) enum PdfStringConditionOperator {
  PdfStringEquals
  PdfStringNotEquals
  PdfStringContains
  PdfStringNotContains
  PdfStringStartsWith
  PdfStringEndsWith
  PdfStringEmpty
  PdfStringNotEmpty
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) enum PdfNumberConditionOperator {
  PdfNumberEquals
  PdfNumberNotEquals
  PdfNumberGreaterThan
  PdfNumberGreaterThanOrEqual
  PdfNumberLessThan
  PdfNumberLessThanOrEqual
  PdfNumberEmpty
  PdfNumberNotEmpty
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) enum PdfBoolConditionOperator {
  PdfBoolEquals
  PdfBoolNotEquals
  PdfBoolEmpty
  PdfBoolNotEmpty
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) enum PdfConditionExpression {
  PdfStringCondition(
    field_key~ : String,
    operator~ : PdfStringConditionOperator,
    expected~ : String
  )
  PdfNumberCondition(
    field_key~ : String,
    operator~ : PdfNumberConditionOperator,
    expected~ : Int
  )
  PdfBoolCondition(
    field_key~ : String,
    operator~ : PdfBoolConditionOperator,
    expected~ : Bool
  )
  PdfNestedConditionGroup(PdfConditionGroup)
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) enum PdfConditionGroupOperator {
  PdfConditionAll
  PdfConditionAny
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfConditionGroup {
  operator : PdfConditionGroupOperator
  conditions : Array[PdfConditionExpression]
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) enum PdfLayoutResolveMode {
  PdfEditorPreview
  PdfRenderOutput
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfResolvedPage {
  id : String
  size : PdfPageSize
  nodes : Array[PdfResolvedNode]
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfResolvedNode {
  node_id : String
  node_type : String
  rect : PdfRect
  content : PdfResolvedNodeContent?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) enum PdfResolvedNodeContent {
  PdfResolvedText(value~ : String, style~ : PdfTextStyle)
  PdfResolvedImage(url~ : String, alt~ : String?, fit~ : PdfImageFit)
  PdfResolvedStaticTable(headers~ : Array[String], rows~ : Array[Array[String]])
  PdfResolvedDataTable(
    headers~ : Array[String],
    rows~ : Array[Array[String]],
    empty_text~ : String
  )
  PdfResolvedShape(kind~ : PdfShapeKind, style~ : PdfShapeStyle)
  PdfResolvedGroup(children~ : Array[PdfResolvedNode])
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfLayoutResolveResult {
  ok : Bool
  tool : String
  document_id : String
  mode : String
  pages : Array[PdfResolvedPage]
  diagnostics : Array[Diagnostic]
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfLayoutValidationResult {
  ok : Bool
  diagnostics : Array[Diagnostic]
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfRectPatch {
  x : Int?
  y : Int?
  width : Int?
  height : Int?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfNodeFramePatch {
  rect : PdfRectPatch?
  visible_when : PdfConditionGroup?
  clear_visible_when : Bool?
  locked : Bool?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfTextStylePatch {
  font_family : String?
  font_size : Int?
  color : PdfColor?
  align : PdfTextAlign?
  bold : Bool?
  italic : Bool?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfTextNodePatch {
  frame : PdfNodeFramePatch?
  source : PdfTextSource?
  style : PdfTextStylePatch?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfImageNodePatch {
  frame : PdfNodeFramePatch?
  source : PdfImageSource?
  alt : PdfTextSource?
  clear_alt : Bool?
  fit : PdfImageFit?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfStaticTableNodePatch {
  frame : PdfNodeFramePatch?
  columns : Array[PdfTableColumn]?
  rows : Array[Array[PdfTextSource]]?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfDataTableNodePatch {
  frame : PdfNodeFramePatch?
  collection_key : String?
  columns : Array[PdfDataTableColumn]?
  empty_text : String?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfShapeNodePatch {
  frame : PdfNodeFramePatch?
  kind : PdfShapeKind?
  style : PdfShapeStyle?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfGroupNodePatch {
  frame : PdfNodeFramePatch?
  children : Array[PdfLayoutNode]?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) enum PdfLayoutPatch {
  PdfPatchText(PdfTextNodePatch)
  PdfPatchImage(PdfImageNodePatch)
  PdfPatchStaticTable(PdfStaticTableNodePatch)
  PdfPatchDataTable(PdfDataTableNodePatch)
  PdfPatchShape(PdfShapeNodePatch)
  PdfPatchGroup(PdfGroupNodePatch)
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub(all) struct PdfLayoutPatchResult {
  document : PdfLayoutDocument
  changed : Bool
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub fn pdf_layout_default_color() -> PdfColor {
  { red: 33, green: 38, blue: 41, alpha: 255 }
}

///|
pub fn pdf_layout_default_text_style() -> PdfTextStyle {
  {
    font_family: "sans-serif",
    font_size: 12,
    color: pdf_layout_default_color(),
    align: PdfTextAlignLeft,
    bold: false,
    italic: false,
  }
}

///|
pub fn pdf_layout_empty_data() -> PdfLayoutData {
  {
    text_values: [],
    image_values: [],
    number_values: [],
    bool_values: [],
    data_lists: [],
  }
}

///|
pub fn pdf_layout_pages_to_array(
  pages : PdfLayoutPages,
) -> Array[PdfLayoutPage] {
  let all_pages : Array[PdfLayoutPage] = [pages.first]
  for page in pages.rest {
    all_pages.push(page)
  }
  all_pages
}

///|
pub fn pdf_layout_resolve_mode_from_string(
  value : String,
) -> PdfLayoutResolveMode {
  match value {
    "editor" | "preview" | "editor_preview" => PdfEditorPreview
    _ => PdfRenderOutput
  }
}

///|
pub fn pdf_layout_resolve_mode_name(mode : PdfLayoutResolveMode) -> String {
  match mode {
    PdfEditorPreview => "editor_preview"
    PdfRenderOutput => "pdf_render"
  }
}

///|
pub fn validate_pdf_layout_document(
  document : PdfLayoutDocument,
) -> PdfLayoutValidationResult {
  let diagnostics : Array[Diagnostic] = []
  if document.id == "" {
    diagnostics.push(invalid_value("id", "non-empty string", "empty string"))
  }
  let seen_ids : Array[String] = []
  let seen_page_ids : Array[String] = []
  for page_index, page in pdf_layout_pages_to_array(document.pages) {
    validate_pdf_layout_page(
      page,
      page_index,
      seen_page_ids,
      seen_ids,
      diagnostics,
    )
  }
  { ok: diagnostics.length() == 0, diagnostics }
}

///|
pub fn resolve_pdf_layout_document(
  document : PdfLayoutDocument,
  data : PdfLayoutData,
  mode : PdfLayoutResolveMode,
) -> PdfLayoutResolveResult {
  let validation = validate_pdf_layout_document(document)
  if !validation.ok {
    return {
      ok: false,
      tool: "resolve_pdf_layout_document",
      document_id: document.id,
      mode: pdf_layout_resolve_mode_name(mode),
      pages: [],
      diagnostics: validation.diagnostics,
    }
  }
  let pages : Array[PdfResolvedPage] = []
  for page in pdf_layout_pages_to_array(document.pages) {
    pages.push({
      id: page.id,
      size: page.size,
      nodes: resolve_pdf_layout_nodes(page.nodes, data, mode),
    })
  }
  {
    ok: true,
    tool: "resolve_pdf_layout_document",
    document_id: document.id,
    mode: pdf_layout_resolve_mode_name(mode),
    pages,
    diagnostics: [],
  }
}

///|
pub fn pdf_layout_resolve_error(message : String) -> PdfLayoutResolveResult {
  {
    ok: false,
    tool: "resolve_pdf_layout_document",
    document_id: "",
    mode: "unknown",
    pages: [],
    diagnostics: [
      {
        kind: "parse",
        code: "bridge_error",
        path: "request",
        message,
        expected: Some("valid PDF layout resolve request"),
        received: Some("invalid request"),
      },
    ],
  }
}

///|
pub fn update_pdf_layout_text_node(
  document : PdfLayoutDocument,
  node_id : String,
  patch : PdfTextNodePatch,
) -> PdfLayoutPatchResult {
  patch_pdf_layout_document(document, node_id, PdfPatchText(patch))
}

///|
pub fn update_pdf_layout_image_node(
  document : PdfLayoutDocument,
  node_id : String,
  patch : PdfImageNodePatch,
) -> PdfLayoutPatchResult {
  patch_pdf_layout_document(document, node_id, PdfPatchImage(patch))
}

///|
pub fn update_pdf_layout_static_table_node(
  document : PdfLayoutDocument,
  node_id : String,
  patch : PdfStaticTableNodePatch,
) -> PdfLayoutPatchResult {
  patch_pdf_layout_document(document, node_id, PdfPatchStaticTable(patch))
}

///|
pub fn update_pdf_layout_data_table_node(
  document : PdfLayoutDocument,
  node_id : String,
  patch : PdfDataTableNodePatch,
) -> PdfLayoutPatchResult {
  patch_pdf_layout_document(document, node_id, PdfPatchDataTable(patch))
}

///|
pub fn update_pdf_layout_shape_node(
  document : PdfLayoutDocument,
  node_id : String,
  patch : PdfShapeNodePatch,
) -> PdfLayoutPatchResult {
  patch_pdf_layout_document(document, node_id, PdfPatchShape(patch))
}

///|
pub fn update_pdf_layout_group_node(
  document : PdfLayoutDocument,
  node_id : String,
  patch : PdfGroupNodePatch,
) -> PdfLayoutPatchResult {
  patch_pdf_layout_document(document, node_id, PdfPatchGroup(patch))
}

///|
fn validate_pdf_layout_page(
  page : PdfLayoutPage,
  page_index : Int,
  seen_page_ids : Array[String],
  seen_ids : Array[String],
  diagnostics : Array[Diagnostic],
) -> Unit {
  let path = pdf_layout_page_path(page_index)
  if page.id == "" {
    diagnostics.push(missing_field(path, "id"))
  } else if string_array_contains(seen_page_ids, page.id) {
    diagnostics.push(
      invalid_value(path_join(path, "id"), "unique page id", page.id),
    )
  } else {
    seen_page_ids.push(page.id)
  }
  if page.size.width <= 0 {
    diagnostics.push(
      invalid_value(
        path_join(path, "size.width"),
        "positive integer",
        page.size.width.to_string(),
      ),
    )
  }
  if page.size.height <= 0 {
    diagnostics.push(
      invalid_value(
        path_join(path, "size.height"),
        "positive integer",
        page.size.height.to_string(),
      ),
    )
  }
  validate_pdf_layout_nodes(
    page.nodes,
    path_join(path, "nodes"),
    seen_ids,
    diagnostics,
  )
}

///|
fn pdf_layout_page_path(page_index : Int) -> String {
  if page_index == 0 {
    "pages.first"
  } else {
    path_join("pages.rest", (page_index - 1).to_string())
  }
}

///|
fn validate_pdf_layout_nodes(
  nodes : Array[PdfLayoutNode],
  path : String,
  seen_ids : Array[String],
  diagnostics : Array[Diagnostic],
) -> Unit {
  for index, node in nodes {
    validate_pdf_layout_node(
      node,
      index_path(path, index),
      seen_ids,
      diagnostics,
    )
  }
}

///|
fn validate_pdf_layout_node(
  node : PdfLayoutNode,
  path : String,
  seen_ids : Array[String],
  diagnostics : Array[Diagnostic],
) -> Unit {
  let frame = pdf_layout_node_frame(node)
  validate_pdf_node_frame(
    frame,
    path_join(path, "frame"),
    seen_ids,
    diagnostics,
  )
  match node {
    PdfLayoutText(_) => ()
    PdfLayoutImage(_) => ()
    PdfLayoutStaticTable(table) =>
      if table.columns.length() == 0 {
        diagnostics.push(
          invalid_value(
            path_join(path, "columns"),
            "at least one column",
            "empty array",
          ),
        )
      }
    PdfLayoutDataTable(table) => {
      if table.collection_key == "" {
        diagnostics.push(missing_field(path, "collection_key"))
      }
      if table.columns.length() == 0 {
        diagnostics.push(
          invalid_value(
            path_join(path, "columns"),
            "at least one column",
            "empty array",
          ),
        )
      }
    }
    PdfLayoutShape(shape) =>
      if shape.style.stroke_width < 0 {
        diagnostics.push(
          invalid_value(
            path_join(path, "style.stroke_width"),
            "non-negative integer",
            shape.style.stroke_width.to_string(),
          ),
        )
      }
    PdfLayoutGroup(group) =>
      validate_pdf_layout_nodes(
        group.children,
        path_join(path, "children"),
        seen_ids,
        diagnostics,
      )
  }
}

///|
fn validate_pdf_node_frame(
  frame : PdfNodeFrame,
  path : String,
  seen_ids : Array[String],
  diagnostics : Array[Diagnostic],
) -> Unit {
  if frame.id == "" {
    diagnostics.push(missing_field(path, "id"))
  } else if string_array_contains(seen_ids, frame.id) {
    diagnostics.push(
      invalid_value(path_join(path, "id"), "unique node id", frame.id),
    )
  } else {
    seen_ids.push(frame.id)
  }
  if frame.rect.width <= 0 {
    diagnostics.push(
      invalid_value(
        path_join(path, "rect.width"),
        "positive integer",
        frame.rect.width.to_string(),
      ),
    )
  }
  if frame.rect.height <= 0 {
    diagnostics.push(
      invalid_value(
        path_join(path, "rect.height"),
        "positive integer",
        frame.rect.height.to_string(),
      ),
    )
  }
}

///|
fn resolve_pdf_layout_nodes(
  nodes : Array[PdfLayoutNode],
  data : PdfLayoutData,
  mode : PdfLayoutResolveMode,
) -> Array[PdfResolvedNode] {
  let resolved : Array[PdfResolvedNode] = []
  for node in nodes {
    resolved.push(resolve_pdf_layout_node(node, data, mode))
  }
  resolved
}

///|
fn resolve_pdf_layout_node(
  node : PdfLayoutNode,
  data : PdfLayoutData,
  mode : PdfLayoutResolveMode,
) -> PdfResolvedNode {
  let frame = pdf_layout_node_frame(node)
  if !pdf_node_is_visible(frame, data) {
    return {
      node_id: frame.id,
      node_type: pdf_layout_node_type(node),
      rect: frame.rect,
      content: None,
    }
  }
  {
    node_id: frame.id,
    node_type: pdf_layout_node_type(node),
    rect: frame.rect,
    content: Some(resolve_pdf_layout_node_content(node, data, mode)),
  }
}

///|
fn resolve_pdf_layout_node_content(
  node : PdfLayoutNode,
  data : PdfLayoutData,
  mode : PdfLayoutResolveMode,
) -> PdfResolvedNodeContent {
  match node {
    PdfLayoutText(text) =>
      PdfResolvedText(
        value=resolve_pdf_text_source(text.source, data, mode),
        style=text.style,
      )
    PdfLayoutImage(image) =>
      PdfResolvedImage(
        url=resolve_pdf_image_source(image.source, data, mode),
        alt=match image.alt {
          Some(source) => Some(resolve_pdf_text_source(source, data, mode))
          None => None
        },
        fit=image.fit,
      )
    PdfLayoutStaticTable(table) =>
      PdfResolvedStaticTable(
        headers=resolve_pdf_table_headers(table.columns),
        rows=resolve_pdf_static_table_rows(table.rows, data, mode),
      )
    PdfLayoutDataTable(table) =>
      PdfResolvedDataTable(
        headers=resolve_pdf_data_table_headers(table.columns),
        rows=resolve_pdf_data_table_rows(
          table.collection_key,
          table.columns,
          data,
          mode,
        ),
        empty_text=table.empty_text,
      )
    PdfLayoutShape(shape) =>
      PdfResolvedShape(kind=shape.kind, style=shape.style)
    PdfLayoutGroup(group) =>
      PdfResolvedGroup(
        children=resolve_pdf_layout_nodes(group.children, data, mode),
      )
  }
}

///|
fn pdf_layout_node_frame(node : PdfLayoutNode) -> PdfNodeFrame {
  match node {
    PdfLayoutText(text) => text.frame
    PdfLayoutImage(image) => image.frame
    PdfLayoutStaticTable(table) => table.frame
    PdfLayoutDataTable(table) => table.frame
    PdfLayoutShape(shape) => shape.frame
    PdfLayoutGroup(group) => group.frame
  }
}

///|
fn pdf_layout_node_type(node : PdfLayoutNode) -> String {
  match node {
    PdfLayoutText(_) => "text"
    PdfLayoutImage(_) => "image"
    PdfLayoutStaticTable(_) => "static_table"
    PdfLayoutDataTable(_) => "data_table"
    PdfLayoutShape(_) => "shape"
    PdfLayoutGroup(_) => "group"
  }
}

///|
fn pdf_node_is_visible(frame : PdfNodeFrame, data : PdfLayoutData) -> Bool {
  match frame.visible_when {
    Some(condition) => evaluate_pdf_condition_group(condition, data)
    None => true
  }
}

///|
fn evaluate_pdf_condition_group(
  group : PdfConditionGroup,
  data : PdfLayoutData,
) -> Bool {
  match group.operator {
    PdfConditionAll => {
      for condition in group.conditions {
        if !evaluate_pdf_condition(condition, data) {
          return false
        }
      }
      true
    }
    PdfConditionAny => {
      for condition in group.conditions {
        if evaluate_pdf_condition(condition, data) {
          return true
        }
      }
      false
    }
  }
}

///|
fn evaluate_pdf_condition(
  condition : PdfConditionExpression,
  data : PdfLayoutData,
) -> Bool {
  match condition {
    PdfStringCondition(field_key~, operator~, expected~) =>
      evaluate_pdf_string_condition(
        lookup_pdf_text(data, field_key),
        operator,
        expected,
      )
    PdfNumberCondition(field_key~, operator~, expected~) =>
      evaluate_pdf_number_condition(
        lookup_pdf_number(data, field_key),
        operator,
        expected,
      )
    PdfBoolCondition(field_key~, operator~, expected~) =>
      evaluate_pdf_bool_condition(
        lookup_pdf_bool(data, field_key),
        operator,
        expected,
      )
    PdfNestedConditionGroup(group) => evaluate_pdf_condition_group(group, data)
  }
}

///|
fn evaluate_pdf_string_condition(
  value : String?,
  operator : PdfStringConditionOperator,
  expected : String,
) -> Bool {
  let actual = value.unwrap_or("")
  match operator {
    PdfStringEquals => actual == expected
    PdfStringNotEquals => actual != expected
    PdfStringContains => actual.contains(expected[:])
    PdfStringNotContains => !actual.contains(expected[:])
    PdfStringStartsWith => string_starts_with(actual, expected)
    PdfStringEndsWith => string_ends_with(actual, expected)
    PdfStringEmpty => actual == ""
    PdfStringNotEmpty => actual != ""
  }
}

///|
fn evaluate_pdf_number_condition(
  value : Int?,
  operator : PdfNumberConditionOperator,
  expected : Int,
) -> Bool {
  match operator {
    PdfNumberEmpty => value is None
    PdfNumberNotEmpty => value is Some(_)
    _ => {
      let actual = value.unwrap_or(0)
      match operator {
        PdfNumberEquals => actual == expected
        PdfNumberNotEquals => actual != expected
        PdfNumberGreaterThan => actual > expected
        PdfNumberGreaterThanOrEqual => actual >= expected
        PdfNumberLessThan => actual < expected
        PdfNumberLessThanOrEqual => actual <= expected
        PdfNumberEmpty | PdfNumberNotEmpty => false
      }
    }
  }
}

///|
fn evaluate_pdf_bool_condition(
  value : Bool?,
  operator : PdfBoolConditionOperator,
  expected : Bool,
) -> Bool {
  match operator {
    PdfBoolEmpty => value is None
    PdfBoolNotEmpty => value is Some(_)
    _ => {
      let actual = value.unwrap_or(false)
      match operator {
        PdfBoolEquals => actual == expected
        PdfBoolNotEquals => actual != expected
        PdfBoolEmpty | PdfBoolNotEmpty => false
      }
    }
  }
}

///|
fn resolve_pdf_text_source(
  source : PdfTextSource,
  data : PdfLayoutData,
  mode : PdfLayoutResolveMode,
) -> String {
  match source {
    PdfFixedText(value) => value
    PdfBoundText(key) =>
      match lookup_pdf_text(data, key) {
        Some(value) => value
        None => missing_pdf_binding_text(key, mode)
      }
  }
}

///|
fn resolve_pdf_image_source(
  source : PdfImageSource,
  data : PdfLayoutData,
  mode : PdfLayoutResolveMode,
) -> String {
  match source {
    PdfFixedImage(url) => url
    PdfBoundImage(key) =>
      match lookup_pdf_image(data, key) {
        Some(url) => url
        None => missing_pdf_binding_text(key, mode)
      }
  }
}

///|
fn missing_pdf_binding_text(
  key : String,
  mode : PdfLayoutResolveMode,
) -> String {
  match mode {
    PdfEditorPreview => "{{" + key + "}}"
    PdfRenderOutput => ""
  }
}

///|
fn resolve_pdf_table_headers(columns : Array[PdfTableColumn]) -> Array[String] {
  let headers : Array[String] = []
  for column in columns {
    headers.push(column.header)
  }
  headers
}

///|
fn resolve_pdf_data_table_headers(
  columns : Array[PdfDataTableColumn],
) -> Array[String] {
  let headers : Array[String] = []
  for column in columns {
    headers.push(column.header)
  }
  headers
}

///|
fn resolve_pdf_static_table_rows(
  rows : Array[Array[PdfTextSource]],
  data : PdfLayoutData,
  mode : PdfLayoutResolveMode,
) -> Array[Array[String]] {
  let resolved_rows : Array[Array[String]] = []
  for row in rows {
    let resolved_row : Array[String] = []
    for cell in row {
      resolved_row.push(resolve_pdf_text_source(cell, data, mode))
    }
    resolved_rows.push(resolved_row)
  }
  resolved_rows
}

///|
fn resolve_pdf_data_table_rows(
  collection_key : String,
  columns : Array[PdfDataTableColumn],
  data : PdfLayoutData,
  mode : PdfLayoutResolveMode,
) -> Array[Array[String]] {
  let resolved_rows : Array[Array[String]] = []
  match lookup_pdf_data_list(data, collection_key) {
    Some(list) =>
      for row in list.rows {
        let resolved_row : Array[String] = []
        for column in columns {
          resolved_row.push(
            lookup_pdf_row_text(row, column.field_key).unwrap_or(
              missing_pdf_binding_text(
                pdf_data_table_binding_key(collection_key, column.field_key),
                mode,
              ),
            ),
          )
        }
        resolved_rows.push(resolved_row)
      }
    None =>
      if mode == PdfEditorPreview {
        let placeholder_row : Array[String] = []
        for column in columns {
          placeholder_row.push(
            missing_pdf_binding_text(
              pdf_data_table_binding_key(collection_key, column.field_key),
              mode,
            ),
          )
        }
        resolved_rows.push(placeholder_row)
      }
  }
  resolved_rows
}

///|
fn pdf_data_table_binding_key(collection_key : String, field_key : String) -> String {
  if collection_key == "" {
    field_key
  } else if field_key == "" {
    collection_key
  } else {
    collection_key + "." + field_key
  }
}

///|
fn patch_pdf_layout_document(
  document : PdfLayoutDocument,
  node_id : String,
  patch : PdfLayoutPatch,
) -> PdfLayoutPatchResult {
  let (first, first_changed) = patch_pdf_layout_page(
    document.pages.first,
    node_id,
    patch,
  )
  let rest : Array[PdfLayoutPage] = []
  let mut rest_changed = false
  for page in document.pages.rest {
    let (patched_page, page_changed) = patch_pdf_layout_page(
      page, node_id, patch,
    )
    rest.push(patched_page)
    if page_changed {
      rest_changed = true
    }
  }
  let changed = first_changed || rest_changed
  {
    document: if changed {
      { id: document.id, title: document.title, pages: { first, rest } }
    } else {
      document
    },
    changed,
  }
}

///|
fn patch_pdf_layout_page(
  page : PdfLayoutPage,
  node_id : String,
  patch : PdfLayoutPatch,
) -> (PdfLayoutPage, Bool) {
  let (nodes, changed) = patch_pdf_layout_nodes(page.nodes, node_id, patch)
  if changed {
    ({ id: page.id, size: page.size, nodes }, true)
  } else {
    (page, false)
  }
}

///|
fn patch_pdf_layout_nodes(
  nodes : Array[PdfLayoutNode],
  node_id : String,
  patch : PdfLayoutPatch,
) -> (Array[PdfLayoutNode], Bool) {
  let patched_nodes : Array[PdfLayoutNode] = []
  let mut changed = false
  for node in nodes {
    let (patched_node, node_changed) = patch_pdf_layout_node(
      node, node_id, patch,
    )
    patched_nodes.push(patched_node)
    if node_changed {
      changed = true
    }
  }
  (patched_nodes, changed)
}

///|
fn patch_pdf_layout_node(
  node : PdfLayoutNode,
  node_id : String,
  patch : PdfLayoutPatch,
) -> (PdfLayoutNode, Bool) {
  let frame = pdf_layout_node_frame(node)
  if frame.id == node_id {
    return apply_pdf_layout_patch(node, patch)
  }
  match node {
    PdfLayoutGroup(group) => {
      let (children, changed) = patch_pdf_layout_nodes(
        group.children,
        node_id,
        patch,
      )
      if changed {
        (PdfLayoutGroup({ frame: group.frame, children }), true)
      } else {
        (node, false)
      }
    }
    _ => (node, false)
  }
}

///|
fn apply_pdf_layout_patch(
  node : PdfLayoutNode,
  patch : PdfLayoutPatch,
) -> (PdfLayoutNode, Bool) {
  match (node, patch) {
    (PdfLayoutText(text), PdfPatchText(patch)) =>
      (
        PdfLayoutText({
          frame: patch_pdf_node_frame(text.frame, patch.frame),
          source: patch.source.unwrap_or(text.source),
          style: patch_pdf_text_style(text.style, patch.style),
        }),
        true,
      )
    (PdfLayoutImage(image), PdfPatchImage(patch)) =>
      (
        PdfLayoutImage({
          frame: patch_pdf_node_frame(image.frame, patch.frame),
          source: patch.source.unwrap_or(image.source),
          alt: patch_pdf_optional_text_source(
            image.alt,
            patch.alt,
            patch.clear_alt,
          ),
          fit: patch.fit.unwrap_or(image.fit),
        }),
        true,
      )
    (PdfLayoutStaticTable(table), PdfPatchStaticTable(patch)) =>
      (
        PdfLayoutStaticTable({
          frame: patch_pdf_node_frame(table.frame, patch.frame),
          columns: patch.columns.unwrap_or(table.columns),
          rows: patch.rows.unwrap_or(table.rows),
        }),
        true,
      )
    (PdfLayoutDataTable(table), PdfPatchDataTable(patch)) =>
      (
        PdfLayoutDataTable({
          frame: patch_pdf_node_frame(table.frame, patch.frame),
          collection_key: patch.collection_key.unwrap_or(table.collection_key),
          columns: patch.columns.unwrap_or(table.columns),
          empty_text: patch.empty_text.unwrap_or(table.empty_text),
        }),
        true,
      )
    (PdfLayoutShape(shape), PdfPatchShape(patch)) =>
      (
        PdfLayoutShape({
          frame: patch_pdf_node_frame(shape.frame, patch.frame),
          kind: patch.kind.unwrap_or(shape.kind),
          style: patch.style.unwrap_or(shape.style),
        }),
        true,
      )
    (PdfLayoutGroup(group), PdfPatchGroup(patch)) =>
      (
        PdfLayoutGroup({
          frame: patch_pdf_node_frame(group.frame, patch.frame),
          children: patch.children.unwrap_or(group.children),
        }),
        true,
      )
    _ => (node, false)
  }
}

///|
fn patch_pdf_node_frame(
  frame : PdfNodeFrame,
  patch : PdfNodeFramePatch?,
) -> PdfNodeFrame {
  match patch {
    Some(patch) =>
      {
        id: frame.id,
        rect: patch_pdf_rect(frame.rect, patch.rect),
        visible_when: patch_pdf_optional_condition(
          frame.visible_when,
          patch.visible_when,
          patch.clear_visible_when,
        ),
        locked: patch.locked.unwrap_or(frame.locked),
      }
    None => frame
  }
}

///|
fn patch_pdf_optional_condition(
  original : PdfConditionGroup?,
  replacement : PdfConditionGroup?,
  clear : Bool?,
) -> PdfConditionGroup? {
  if clear.unwrap_or(false) {
    None
  } else {
    match replacement {
      Some(value) => Some(value)
      None => original
    }
  }
}

///|
fn patch_pdf_optional_text_source(
  original : PdfTextSource?,
  replacement : PdfTextSource?,
  clear : Bool?,
) -> PdfTextSource? {
  if clear.unwrap_or(false) {
    None
  } else {
    match replacement {
      Some(value) => Some(value)
      None => original
    }
  }
}

///|
fn patch_pdf_rect(rect : PdfRect, patch : PdfRectPatch?) -> PdfRect {
  match patch {
    Some(patch) =>
      {
        x: patch.x.unwrap_or(rect.x),
        y: patch.y.unwrap_or(rect.y),
        width: patch.width.unwrap_or(rect.width),
        height: patch.height.unwrap_or(rect.height),
      }
    None => rect
  }
}

///|
fn patch_pdf_text_style(
  style : PdfTextStyle,
  patch : PdfTextStylePatch?,
) -> PdfTextStyle {
  match patch {
    Some(patch) =>
      {
        font_family: patch.font_family.unwrap_or(style.font_family),
        font_size: patch.font_size.unwrap_or(style.font_size),
        color: patch.color.unwrap_or(style.color),
        align: patch.align.unwrap_or(style.align),
        bold: patch.bold.unwrap_or(style.bold),
        italic: patch.italic.unwrap_or(style.italic),
      }
    None => style
  }
}

///|
fn lookup_pdf_text(data : PdfLayoutData, key : String) -> String? {
  for binding in data.text_values {
    if binding.key == key {
      return Some(binding.value)
    }
  }
  None
}

///|
fn lookup_pdf_image(data : PdfLayoutData, key : String) -> String? {
  for binding in data.image_values {
    if binding.key == key {
      return Some(binding.url)
    }
  }
  None
}

///|
fn lookup_pdf_number(data : PdfLayoutData, key : String) -> Int? {
  for binding in data.number_values {
    if binding.key == key {
      return Some(binding.value)
    }
  }
  None
}

///|
fn lookup_pdf_bool(data : PdfLayoutData, key : String) -> Bool? {
  for binding in data.bool_values {
    if binding.key == key {
      return Some(binding.value)
    }
  }
  None
}

///|
fn lookup_pdf_data_list(
  data : PdfLayoutData,
  key : String,
) -> PdfDataListBinding? {
  for binding in data.data_lists {
    if binding.key == key {
      return Some(binding)
    }
  }
  None
}

///|
fn lookup_pdf_row_text(row : PdfDataRow, key : String) -> String? {
  for cell in row.cells {
    if cell.key == key {
      return Some(cell.value)
    }
  }
  None
}

///|
fn string_array_contains(values : Array[String], target : String) -> Bool {
  for value in values {
    if value == target {
      return true
    }
  }
  false
}

///|
fn string_starts_with(text : String, prefix : String) -> Bool {
  text.length() >= prefix.length() &&
  text[0:prefix.length()].to_owned() == prefix
}

///|
fn string_ends_with(text : String, suffix : String) -> Bool {
  if suffix.length() > text.length() {
    false
  } else {
    text[text.length() - suffix.length():].to_owned() == suffix
  }
}
