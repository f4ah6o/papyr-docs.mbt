///|
fn pdf_test_frame(
  id : String,
  x : Int,
  y : Int,
  width : Int,
  height : Int,
) -> PdfNodeFrame {
  { id, rect: { x, y, width, height }, visible_when: None, locked: false }
}

///|
fn pdf_test_visible_when_logo() -> PdfConditionGroup {
  {
    operator: PdfConditionAll,
    conditions: [
      PdfBoolCondition(
        field_key="show_logo",
        operator=PdfBoolEquals,
        expected=true,
      ),
    ],
  }
}

///|
fn pdf_test_document() -> PdfLayoutDocument {
  {
    id: "invoice-template",
    title: "Invoice",
    pages: {
      first: {
        id: "page-1",
        size: { width: 595, height: 842 },
        nodes: [
          PdfLayoutText({
            frame: pdf_test_frame("invoice-number", 40, 36, 180, 24),
            source: PdfBoundText("invoice_number"),
            style: pdf_layout_default_text_style(),
          }),
          PdfLayoutImage({
            frame: {
              id: "logo",
              rect: { x: 420, y: 32, width: 96, height: 48 },
              visible_when: Some(pdf_test_visible_when_logo()),
              locked: false,
            },
            source: PdfBoundImage("logo_url"),
            alt: Some(PdfFixedText("Company logo")),
            fit: PdfImageFitContain,
          }),
          PdfLayoutDataTable({
            frame: pdf_test_frame("line-items", 40, 128, 500, 160),
            collection_key: "items",
            columns: [
              {
                key: "name",
                header: "Item",
                field_key: "name",
                width: Some(300),
                align: PdfTextAlignLeft,
              },
              {
                key: "qty",
                header: "Qty",
                field_key: "quantity",
                width: Some(80),
                align: PdfTextAlignRight,
              },
            ],
            empty_text: "No line items",
          }),
          PdfLayoutShape({
            frame: pdf_test_frame("divider", 40, 312, 500, 1),
            kind: PdfShapeLine,
            style: {
              fill: None,
              stroke: Some({ red: 210, green: 214, blue: 218, alpha: 255 }),
              stroke_width: 1,
            },
          }),
        ],
      },
      rest: [],
    },
  }
}

///|
fn pdf_test_data() -> PdfLayoutData {
  {
    text_values: [{ key: "invoice_number", value: "INV-100" }],
    image_values: [{ key: "logo_url", url: "https://example.test/logo.png" }],
    number_values: [],
    bool_values: [{ key: "show_logo", value: false }],
    data_lists: [
      {
        key: "items",
        rows: [
          {
            cells: [
              { key: "name", value: "Design" },
              { key: "quantity", value: "2" },
            ],
          },
        ],
      },
    ],
  }
}

///|
test "PDF layout resolver uses one typed model for preview and PDF output" {
  let result = resolve_pdf_layout_document(
    pdf_test_document(),
    pdf_test_data(),
    PdfEditorPreview,
  )
  inspect(result.ok, content="true")
  inspect(result.pages.length(), content="1")
  inspect(result.pages[0].nodes.length(), content="4")

  match result.pages[0].nodes[0].content {
    Some(PdfResolvedText(value~, ..)) => inspect(value, content="INV-100")
    _ => inspect("wrong node", content="text node")
  }

  inspect(result.pages[0].nodes[1].content is None, content="true")

  match result.pages[0].nodes[2].content {
    Some(PdfResolvedDataTable(headers~, rows~, ..)) => {
      inspect(headers[0], content="Item")
      inspect(rows[0][0], content="Design")
      inspect(rows[0][1], content="2")
    }
    _ => inspect("wrong node", content="data table")
  }
}

///|
test "PDF layout preview marks missing bindings while render output stays blank" {
  let preview = resolve_pdf_layout_document(
    pdf_test_document(),
    pdf_layout_empty_data(),
    PdfEditorPreview,
  )
  let rendered = resolve_pdf_layout_document(
    pdf_test_document(),
    pdf_layout_empty_data(),
    PdfRenderOutput,
  )
  match preview.pages[0].nodes[0].content {
    Some(PdfResolvedText(value~, ..)) =>
      inspect(value, content="{{invoice_number}}")
    _ => inspect("wrong node", content="text node")
  }
  match rendered.pages[0].nodes[0].content {
    Some(PdfResolvedText(value~, ..)) => inspect(value, content="")
    _ => inspect("wrong node", content="text node")
  }
  match preview.pages[0].nodes[2].content {
    Some(PdfResolvedDataTable(rows~, ..)) => {
      inspect(rows.length(), content="1")
      inspect(rows[0][0], content="{{items.name}}")
      inspect(rows[0][1], content="{{items.quantity}}")
    }
    _ => inspect("wrong node", content="data table")
  }
  match rendered.pages[0].nodes[2].content {
    Some(PdfResolvedDataTable(rows~, ..)) => inspect(rows.length(), content="0")
    _ => inspect("wrong node", content="data table")
  }
}

///|
test "PDF layout preview namespaces missing data table cells" {
  let data : PdfLayoutData = {
    text_values: [{ key: "invoice_number", value: "INV-100" }],
    image_values: [],
    number_values: [],
    bool_values: [{ key: "show_logo", value: false }],
    data_lists: [
      {
        key: "items",
        rows: [{ cells: [{ key: "name", value: "Design" }] }],
      },
    ],
  }
  let preview = resolve_pdf_layout_document(
    pdf_test_document(),
    data,
    PdfEditorPreview,
  )
  match preview.pages[0].nodes[2].content {
    Some(PdfResolvedDataTable(rows~, ..)) => {
      inspect(rows[0][0], content="Design")
      inspect(rows[0][1], content="{{items.quantity}}")
    }
    _ => inspect("wrong node", content="data table")
  }
}

///|
test "PDF layout typed patch updates text nodes and rejects mismatched node kinds" {
  let patch : PdfTextNodePatch = {
    frame: Some({
      rect: Some({ x: Some(48), y: None, width: None, height: None }),
      visible_when: None,
      clear_visible_when: None,
      locked: None,
    }),
    source: Some(PdfFixedText("Paid invoice")),
    style: Some({
      font_family: None,
      font_size: Some(16),
      color: None,
      align: None,
      bold: Some(true),
      italic: None,
    }),
  }
  let patched = update_pdf_layout_text_node(
    pdf_test_document(),
    "invoice-number",
    patch,
  )
  inspect(patched.changed, content="true")
  let resolved = resolve_pdf_layout_document(
    patched.document,
    pdf_layout_empty_data(),
    PdfRenderOutput,
  )
  inspect(resolved.pages[0].nodes[0].rect.x, content="48")
  match resolved.pages[0].nodes[0].content {
    Some(PdfResolvedText(value~, style~)) => {
      inspect(value, content="Paid invoice")
      inspect(style.font_size, content="16")
      inspect(style.bold, content="true")
    }
    _ => inspect("wrong node", content="text node")
  }

  let rejected = update_pdf_layout_text_node(
    pdf_test_document(),
    "line-items",
    patch,
  )
  inspect(rejected.changed, content="false")
}

///|
test "PDF layout patch clears optional condition and image alt" {
  let patched = update_pdf_layout_image_node(
    pdf_test_document(),
    "logo",
    {
      frame: Some({
        rect: None,
        visible_when: None,
        clear_visible_when: Some(true),
        locked: None,
      }),
      source: None,
      alt: None,
      clear_alt: Some(true),
      fit: None,
    },
  )
  inspect(patched.changed, content="true")
  let resolved = resolve_pdf_layout_document(
    patched.document,
    pdf_layout_empty_data(),
    PdfRenderOutput,
  )
  match resolved.pages[0].nodes[1].content {
    Some(PdfResolvedImage(alt~, ..)) => inspect(alt is None, content="true")
    _ => inspect("wrong node", content="image node")
  }
}

///|
test "PDF layout missing bool bindings behave like false" {
  let document : PdfLayoutDocument = {
    id: "conditional",
    title: "Conditional",
    pages: {
      first: {
        id: "page-1",
        size: { width: 595, height: 842 },
        nodes: [
          PdfLayoutText({
            frame: {
              id: "flag-copy",
              rect: { x: 0, y: 0, width: 120, height: 24 },
              visible_when: Some({
                operator: PdfConditionAll,
                conditions: [
                  PdfBoolCondition(
                    field_key="show_logo",
                    operator=PdfBoolNotEquals,
                    expected=true,
                  ),
                ],
              }),
              locked: false,
            },
            source: PdfFixedText("Visible"),
            style: pdf_layout_default_text_style(),
          }),
        ],
      },
      rest: [],
    },
  }
  let resolved = resolve_pdf_layout_document(
    document,
    pdf_layout_empty_data(),
    PdfEditorPreview,
  )
  inspect(resolved.pages[0].nodes[0].content is Some(_), content="true")
}

///|
test "PDF layout missing number bindings behave like zero" {
  let document : PdfLayoutDocument = {
    id: "conditional-number",
    title: "Conditional Number",
    pages: {
      first: {
        id: "page-1",
        size: { width: 595, height: 842 },
        nodes: [
          PdfLayoutText({
            frame: {
              id: "age-copy",
              rect: { x: 0, y: 0, width: 120, height: 24 },
              visible_when: Some({
                operator: PdfConditionAll,
                conditions: [
                  PdfNumberCondition(
                    field_key="age",
                    operator=PdfNumberNotEquals,
                    expected=1,
                  ),
                ],
              }),
              locked: false,
            },
            source: PdfFixedText("Visible"),
            style: pdf_layout_default_text_style(),
          }),
        ],
      },
      rest: [],
    },
  }
  let resolved = resolve_pdf_layout_document(
    document,
    pdf_layout_empty_data(),
    PdfEditorPreview,
  )
  inspect(resolved.pages[0].nodes[0].content is Some(_), content="true")
}

///|
test "PDF layout validation catches impossible document state" {
  let text = PdfLayoutText({
    frame: pdf_test_frame("duplicate", 0, 0, 120, 24),
    source: PdfFixedText("A"),
    style: pdf_layout_default_text_style(),
  })
  let document : PdfLayoutDocument = {
    id: "bad",
    title: "Bad",
    pages: {
      first: {
        id: "page-1",
        size: { width: 0, height: 842 },
        nodes: [text, text],
      },
      rest: [
        {
          id: "page-1",
          size: { width: 595, height: 842 },
          nodes: [],
        },
      ],
    },
  }
  let validation = validate_pdf_layout_document(document)
  inspect(validation.ok, content="false")
  inspect(validation.diagnostics.length(), content="3")
  inspect(validation.diagnostics[0].path, content="pages.first.size.width")
  inspect(validation.diagnostics[0].code, content="invalid_value")
  inspect(
    validation.diagnostics[1].message,
    content="Expected unique node id but received duplicate",
  )
  inspect(validation.diagnostics[2].path, content="pages.rest.0.id")
  inspect(
    validation.diagnostics[2].message,
    content="Expected unique page id but received page-1",
  )
}
