///|
pub struct PublicationRelationMeta {
  kind : String
  bookId : String?
  chapterOrder : Int?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub struct PublicationDocument {
  id : String
  publication : PublicationRelationMeta?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub struct PublicationHelperDiagnostic {
  code : String
  message : String
  documentId : String
  relatedDocumentIds : Array[String]?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub struct PublicationTreeDiagnostic {
  code : String
  message : String
  documentId : String?
  relation : RawRelation?
  relatedDocumentIds : Array[String]?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub struct PublicationTreeState {
  projection : TreeProjection
  diagnostics : Array[PublicationTreeDiagnostic]
} derive(ToJson, @json.FromJson)

///|
pub struct BuildPublicationTreeStateOptions {
  docs : Array[PublicationDocument]
} derive(ToJson, @json.FromJson)

///|
fn publication_diagnostic_from_helper(
  diagnostic : PublicationHelperDiagnostic,
) -> PublicationTreeDiagnostic {
  {
    code: diagnostic.code,
    message: diagnostic.message,
    documentId: Some(diagnostic.documentId),
    relation: None,
    relatedDocumentIds: diagnostic.relatedDocumentIds,
  }
}

///|
fn publication_diagnostic_from_relation(
  diagnostic : RelationDiagnostic,
) -> PublicationTreeDiagnostic {
  {
    code: diagnostic.code,
    message: diagnostic.message,
    documentId: diagnostic.documentId,
    relation: diagnostic.relation,
    relatedDocumentIds: diagnostic.relatedDocumentIds,
  }
}

///|
fn compare_publication_diagnostics(
  left : PublicationTreeDiagnostic,
  right : PublicationTreeDiagnostic,
) -> Int {
  let code_order = compare_string_ascending(left.code, right.code)
  if code_order != 0 {
    return code_order
  }
  let document_order = compare_string_ascending(left.documentId.unwrap_or(""), right.documentId.unwrap_or(""))
  if document_order != 0 {
    return document_order
  }
  compare_string_ascending(left.message, right.message)
}

///|
pub fn build_publication_tree_state(
  options : BuildPublicationTreeStateOptions,
) -> PublicationTreeState {
  let docs_by_id : Map[String, PublicationDocument] = Map::new()
  for doc in options.docs {
    docs_by_id[doc.id] = doc
  }
  let all_docs : Array[PublicationDocument] = []
  docs_by_id.each(fn(_, doc) { all_docs.push(doc) })
  all_docs.sort_by(fn(left, right) { compare_string_ascending(left.id, right.id) })
  let document_ids : Array[String] = []
  let relations : Array[RawRelation] = []
  let diagnostics : Array[PublicationTreeDiagnostic] = []
  for doc in all_docs {
    document_ids.push(doc.id)
    let projected = publication_relations_for_document(doc)
    for relation in projected.0 {
      relations.push(relation)
    }
    for diagnostic in projected.1 {
      diagnostics.push(publication_diagnostic_from_helper(diagnostic))
    }
  }
  let resolved = resolve_relations({
    documentIds: document_ids,
    relations,
    policy: None,
  })
  for diagnostic in resolved.diagnostics {
    diagnostics.push(publication_diagnostic_from_relation(diagnostic))
  }
  diagnostics.sort_by(compare_publication_diagnostics)
  {
    projection: project_tree({
      documentIds: document_ids,
      relations: resolved.resolvedRelations,
    }),
    diagnostics,
  }
}

///|
fn publication_relations_for_document(
  doc : PublicationDocument,
) -> (Array[RawRelation], Array[PublicationHelperDiagnostic]) {
  match doc.publication {
    None => ([], [])
    Some(publication) =>
      if publication.kind != "chapter" {
        ([], [])
      } else {
        let invalid_fields : Array[String] = []
        let normalized_book_id = match publication.bookId {
          Some(book_id) =>
            if book_id.trim() == "" {
              None
            } else {
              Some(book_id.trim().to_owned())
            }
          None => None
        }
        if normalized_book_id == None {
          invalid_fields.push("bookId")
        }
        let normalized_chapter_order = match publication.chapterOrder {
          Some(order) =>
            if order >= 1 {
              Some(order)
            } else {
              None
            }
          None => None
        }
        if normalized_chapter_order == None {
          invalid_fields.push("chapterOrder")
        }
        match (normalized_book_id, normalized_chapter_order) {
          (Some(book_id), Some(order)) =>
            (
              [
                {
                  source: doc.id,
                  target: book_id,
                  rel: "parent",
                  metadata: Some({ label: None, order: Some(order.to_double()) }),
                },
              ],
              [],
            )
          _ =>
            (
              [],
              [
                {
                  code: "PUBLICATION_CHAPTER_METADATA_INVALID",
                  message: "chapter document \"\{doc.id}\" has invalid publication metadata: \{invalid_fields.join(", ")}",
                  documentId: doc.id,
                  relatedDocumentIds: None,
                },
              ],
            )
        }
      }
  }
}

///|
pub fn list_chapter_ids_for_book(
  book_id : String,
  state : PublicationTreeState,
) -> Array[String] {
  match state.projection.nodes.get(book_id) {
    Some(node) => node.childIds
    None => []
  }
}

///|
pub fn format_relation_diagnostic(diagnostic : PublicationTreeDiagnostic) -> String {
  let related = match diagnostic.relatedDocumentIds {
    Some(ids) =>
      if ids.length() > 0 {
        " [" + ids.join(" -> ") + "]"
      } else {
        ""
      }
    None => ""
  }
  "- [" + diagnostic.code + "] " + diagnostic.message + related
}
