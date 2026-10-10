///|
pub struct DocumentHeading {
  id : String
  level : Int
  text : String
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub struct DocumentBlockVisit {
  block : Block
  index_path : Array[Int]
  parent_list_item : ListItem?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub fn document_title(document : PapyrDocument) -> String {
  match document.title {
    Some(title) => {
      let normalized = collapse_whitespace(title)
      if normalized.length() > 0 {
        return normalized
      }
    }
    None => ()
  }
  for heading in collect_document_headings(document) {
    if heading.level == 1 {
      return heading.text
    }
  }
  document.id
}

///|
pub fn document_text(document : PapyrDocument) -> String {
  let parts : Array[String] = []
  for block in document.blocks {
    let text = document_block_text(block).trim().to_owned()
    if text.length() > 0 {
      parts.push(text)
    }
  }
  join_with(parts, "\n")
}

///|
pub fn collect_document_headings(
  document : PapyrDocument,
) -> Array[DocumentHeading] {
  let headings : Array[DocumentHeading] = []
  for visit in visit_document_blocks(document) {
    match visit.block {
      Heading(id~, level~, content~) => {
        let text = document_inline_text(content)
        if text.length() > 0 {
          headings.push({ id, level, text, })
        }
      }
      _ => ()
    }
  }
  headings
}

///|
pub fn visit_document_blocks(
  document : PapyrDocument,
) -> Array[DocumentBlockVisit] {
  visit_blocks(document.blocks, [], None)
}

///|
pub fn replace_document_block(
  document : PapyrDocument,
  block_id : String,
  block : Block,
) -> PapyrDocument {
  let (blocks, changed) = replace_blocks_by_id(document.blocks, block_id, block)
  if changed {
    { id: document.id, title: document.title, blocks, meta: document.meta, }
  } else {
    document
  }
}

///|
pub fn insert_document_block_after(
  document : PapyrDocument,
  block_id : String,
  block : Block,
) -> PapyrDocument {
  let (blocks, changed) = insert_block_after_id(
    document.blocks,
    block_id,
    block,
  )
  if changed {
    { id: document.id, title: document.title, blocks, meta: document.meta, }
  } else {
    document
  }
}

///|
pub fn remove_document_block(
  document : PapyrDocument,
  block_id : String,
) -> PapyrDocument {
  let (blocks, changed) = remove_block_by_id(document.blocks, block_id)
  if changed {
    { id: document.id, title: document.title, blocks, meta: document.meta, }
  } else {
    document
  }
}

///|
fn visit_blocks(
  blocks : Array[Block],
  base_path : Array[Int],
  parent_list_item : ListItem?,
) -> Array[DocumentBlockVisit] {
  let visits : Array[DocumentBlockVisit] = []
  for index, block in blocks {
    let index_path = append_index(base_path, index)
    visits.push({ block, index_path, parent_list_item, })
    match block {
      List(items~, ..) =>
        for item_index, item in items {
          let item_path = append_index(index_path, item_index)
          for visit in visit_blocks(item.blocks, item_path, Some(item)) {
            visits.push(visit)
          }
        }
      _ => ()
    }
  }
  visits
}

///|
fn document_block_text(block : Block) -> String {
  match block {
    Heading(content~, ..) => document_inline_text(content)
    Paragraph(content~, ..) => document_inline_text(content)
    List(items~, ..) => {
      let parts : Array[String] = []
      for item in items {
        let child_parts : Array[String] = []
        for child in item.blocks {
          let text = document_block_text(child)
          if text.length() > 0 {
            child_parts.push(text)
          }
        }
        let text = join_with(child_parts, "\n")
        if text.length() > 0 {
          parts.push(text)
        }
      }
      join_with(parts, "\n")
    }
    Code(source~, ..) => source
    Table(columns~, rows~, caption~, ..) => {
      let parts : Array[String] = []
      for column in columns {
        parts.push(column.header)
      }
      for row in rows {
        for cell in row {
          parts.push(cell.text)
        }
      }
      match caption {
        Some(caption) => parts.push(caption)
        None => ()
      }
      join_with(parts, " ")
    }
    Mermaid(source~, caption~, ..) =>
      match caption {
        Some(caption) => source + "\n" + caption
        None => source
      }
    Moonlight(svg~, caption~, ..) =>
      match caption {
        Some(caption) => svg + "\n" + caption
        None => svg
      }
    Excalidraw(caption~, ..) => caption.unwrap_or("")
  }
}

///|
fn document_inline_text(runs : Array[InlineRun]) -> String {
  let sb = StringBuilder::new()
  for run in runs {
    sb.write_string(run.text)
  }
  collapse_whitespace(sb.to_string())
}

///|
fn collapse_whitespace(text : String) -> String {
  let sb = StringBuilder::new()
  let mut previous_space = false
  for ch in text {
    if ch == ' ' || ch == '\n' || ch == '\t' || ch == '\r' {
      if !previous_space && sb.to_string().length() > 0 {
        sb.write_char(' ')
      }
      previous_space = true
    } else {
      sb.write_char(ch)
      previous_space = false
    }
  }
  sb.to_string().trim().to_owned()
}

///|
fn append_index(path : Array[Int], index : Int) -> Array[Int] {
  let next : Array[Int] = []
  for part in path {
    next.push(part)
  }
  next.push(index)
  next
}

///|
fn block_id(block : Block) -> String {
  match block {
    Heading(id~, ..) => id
    Paragraph(id~, ..) => id
    List(id~, ..) => id
    Code(id~, ..) => id
    Table(id~, ..) => id
    Mermaid(id~, ..) => id
    Moonlight(id~, ..) => id
    Excalidraw(id~, ..) => id
  }
}

///|
fn replace_blocks_by_id(
  blocks : Array[Block],
  target_id : String,
  replacement : Block,
) -> (Array[Block], Bool) {
  let next : Array[Block] = []
  let mut changed = false
  for block in blocks {
    if block_id(block) == target_id {
      next.push(replacement)
      changed = true
      continue
    }
    match block {
      List(id~, ordered~, items~) => {
        let (next_items, items_changed) = replace_list_items_by_id(
          items, target_id, replacement,
        )
        if items_changed {
          next.push(List(id~, ordered~, items=next_items))
          changed = true
        } else {
          next.push(block)
        }
      }
      _ => next.push(block)
    }
  }
  (next, changed)
}

///|
fn replace_list_items_by_id(
  items : Array[ListItem],
  target_id : String,
  replacement : Block,
) -> (Array[ListItem], Bool) {
  let next : Array[ListItem] = []
  let mut changed = false
  for item in items {
    let (blocks, blocks_changed) = replace_blocks_by_id(
      item.blocks,
      target_id,
      replacement,
    )
    if blocks_changed {
      next.push({ blocks, })
      changed = true
    } else {
      next.push(item)
    }
  }
  (next, changed)
}

///|
fn insert_block_after_id(
  blocks : Array[Block],
  target_id : String,
  insert : Block,
) -> (Array[Block], Bool) {
  let next : Array[Block] = []
  let mut changed = false
  for block in blocks {
    match block {
      List(id~, ordered~, items~) => {
        let (next_items, items_changed) = insert_list_items_after_id(
          items, target_id, insert,
        )
        if items_changed {
          next.push(List(id~, ordered~, items=next_items))
          changed = true
        } else {
          next.push(block)
        }
      }
      _ => next.push(block)
    }
    if block_id(block) == target_id {
      next.push(insert)
      changed = true
    }
  }
  (next, changed)
}

///|
fn insert_list_items_after_id(
  items : Array[ListItem],
  target_id : String,
  insert : Block,
) -> (Array[ListItem], Bool) {
  let next : Array[ListItem] = []
  let mut changed = false
  for item in items {
    let (blocks, blocks_changed) = insert_block_after_id(
      item.blocks,
      target_id,
      insert,
    )
    if blocks_changed {
      next.push({ blocks, })
      changed = true
    } else {
      next.push(item)
    }
  }
  (next, changed)
}

///|
fn remove_block_by_id(
  blocks : Array[Block],
  target_id : String,
) -> (Array[Block], Bool) {
  let next : Array[Block] = []
  let mut changed = false
  for block in blocks {
    if block_id(block) == target_id {
      changed = true
      continue
    }
    match block {
      List(id~, ordered~, items~) => {
        let (next_items, items_changed) = remove_list_items_by_id(
          items, target_id,
        )
        if items_changed {
          next.push(List(id~, ordered~, items=next_items))
          changed = true
        } else {
          next.push(block)
        }
      }
      _ => next.push(block)
    }
  }
  (next, changed)
}

///|
fn remove_list_items_by_id(
  items : Array[ListItem],
  target_id : String,
) -> (Array[ListItem], Bool) {
  let next : Array[ListItem] = []
  let mut changed = false
  for item in items {
    let (blocks, blocks_changed) = remove_block_by_id(item.blocks, target_id)
    if blocks_changed {
      next.push({ blocks, })
      changed = true
    } else {
      next.push(item)
    }
  }
  (next, changed)
}
