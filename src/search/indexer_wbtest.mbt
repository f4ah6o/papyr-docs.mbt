///|
fn search_test_document() -> @core.PapyrDocument {
  {
    id: "d",
    title: Some("T"),
    blocks: [
      @core.Heading(id="h1", level=1, content=[
        { text: "Intro", marks: [], href: None },
      ]),
      @core.Paragraph(id="p1", content=[
        { text: "Body text.", marks: [], href: None },
      ]),
      @core.List(id="l1", ordered=false, items=[
        {
          blocks: [
            @core.Heading(id="h2", level=2, content=[
              { text: "Nested", marks: [], href: None },
            ]),
            @core.Mermaid(id="m1", source="graph TD; A-->B;", caption=None),
          ],
        },
      ]),
    ],
    meta: None,
  }
}

///|
test "search indexable preserves block snapshot order" {
  let indexable = search_to_indexable(search_test_document())
  inspect(indexable.headings, content="Intro\nNested")
  inspect(indexable.body.contains("Body text."[:]), content="true")
  inspect(
    indexable.blocks.map(fn(block) { block.id }),
    content="[h1, p1, l1, h2, m1]",
  )
  inspect(indexable.blocks[0].kind, content="heading")
}

///|
test "search block text extracts table and diagram text" {
  let table = @core.Table(
    id="t",
    columns=[{ key: "a", header: "A", align: None, width: None }],
    rows=[
      [
        { text: "cell-1", colspan: None, rowspan: None },
        { text: "cell-2", colspan: None, rowspan: None },
      ],
    ],
    caption=None,
  )
  inspect(search_block_text(table), content="cell-1 cell-2")
  inspect(
    search_block_text(
      @core.Mermaid(id="m", source="graph TD; A-->B;", caption=None),
    ),
    content="graph TD; A-->B;",
  )
  inspect(
    search_block_text(
      @core.Moonlight(
        id="ml",
        svg="<svg><text x=\"1\">Alpha &amp; <tspan>Beta</tspan></text><path d=\"M0 0\"/><text>&lt;Gamma&gt;</text></svg>",
        caption=Some("Caption"),
      ),
    ),
    content="Caption Alpha & Beta <Gamma>",
  )
}

///|
test "search snippet is case insensitive" {
  inspect(
    search_extract_snippet("Hello World", "world"),
    content="Some(Hello World)",
  )
  inspect(search_extract_snippet("nothing here", "absent"), content="None")
}
