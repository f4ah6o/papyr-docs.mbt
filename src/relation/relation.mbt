///|
pub struct RelationMetadata {
  label : String?
  order : Double?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub struct RawRelation {
  source : String
  target : String
  rel : String
  metadata : RelationMetadata?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub struct ResolvedRelation {
  source : String
  target : String
  rel : String
  metadata : RelationMetadata?
  derived : Bool
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub fn is_stored_relation_kind(value : String) -> Bool {
  value == "parent" ||
  value == "reference" ||
  value == "dependency" ||
  value == "sequence" ||
  value == "tag"
}

///|
pub fn is_derived_relation_kind(value : String) -> Bool {
  value == "child" || value == "backlink"
}

///|
pub fn is_relation_kind(value : String) -> Bool {
  is_stored_relation_kind(value) || is_derived_relation_kind(value)
}

///|
fn compare_string_ascending(left : String, right : String) -> Int {
  left.compare(right)
}

///|
fn metadata_order(metadata : RelationMetadata?) -> Double {
  match metadata {
    Some(value) => value.order.unwrap_or(9007199254740991.0)
    None => 9007199254740991.0
  }
}

///|
fn metadata_label(metadata : RelationMetadata?) -> String {
  match metadata {
    Some(value) => value.label.unwrap_or("")
    None => ""
  }
}

///|
pub fn compare_metadata(
  left : RelationMetadata?,
  right : RelationMetadata?,
) -> Int {
  let left_order = metadata_order(left)
  let right_order = metadata_order(right)
  if left_order < right_order {
    -1
  } else if left_order > right_order {
    1
  } else {
    compare_string_ascending(metadata_label(left), metadata_label(right))
  }
}

///|
pub fn compare_raw_relations(left : RawRelation, right : RawRelation) -> Int {
  let source_order = compare_string_ascending(left.source, right.source)
  if source_order != 0 {
    return source_order
  }
  let target_order = compare_string_ascending(left.target, right.target)
  if target_order != 0 {
    return target_order
  }
  let rel_order = compare_string_ascending(left.rel, right.rel)
  if rel_order != 0 {
    return rel_order
  }
  compare_metadata(left.metadata, right.metadata)
}

///|
pub fn compare_resolved_relations(
  left : ResolvedRelation,
  right : ResolvedRelation,
) -> Int {
  let raw_order = compare_raw_relations(
    {
      source: left.source,
      target: left.target,
      rel: left.rel,
      metadata: left.metadata,
    },
    {
      source: right.source,
      target: right.target,
      rel: right.rel,
      metadata: right.metadata,
    },
  )
  if raw_order != 0 {
    return raw_order
  }
  if left.derived == right.derived {
    0
  } else if left.derived {
    1
  } else {
    -1
  }
}

///|
pub fn sort_raw_relations(relations : Array[RawRelation]) -> Array[RawRelation] {
  let sorted = relations.copy()
  sorted.sort_by(compare_raw_relations)
  sorted
}

///|
pub fn sort_resolved_relations(
  relations : Array[ResolvedRelation],
) -> Array[ResolvedRelation] {
  let sorted = relations.copy()
  sorted.sort_by(compare_resolved_relations)
  sorted
}

///|
pub fn raw_relation_key(relation : RawRelation) -> String {
  relation.source +
  "\u{0000}" +
  relation.target +
  "\u{0000}" +
  relation.rel +
  "\u{0000}" +
  metadata_order_for_key(relation.metadata) +
  "\u{0000}" +
  metadata_label(relation.metadata)
}

///|
fn metadata_order_for_key(metadata : RelationMetadata?) -> String {
  match metadata {
    Some(value) =>
      match value.order {
        Some(order) => {
          let int_order = order.to_int()
          if int_order.to_double() == order {
            int_order.to_string()
          } else {
            order.to_string()
          }
        }
        None => ""
      }
    None => ""
  }
}

///|
pub fn resolved_relation_key(relation : ResolvedRelation) -> String {
  let derived_key = if relation.derived { "derived" } else { "stored" }
  raw_relation_key({
    source: relation.source,
    target: relation.target,
    rel: relation.rel,
    metadata: relation.metadata,
  }) +
  "\u{0000}" +
  derived_key
}

///|
pub fn dedupe_raw_relations(
  relations : Array[RawRelation],
) -> Array[RawRelation] {
  let deduped : Map[String, RawRelation] = Map::new()
  for relation in sort_raw_relations(relations) {
    deduped[raw_relation_key(relation)] = relation
  }
  let result : Array[RawRelation] = []
  deduped.each(fn(_key, relation) { result.push(relation) })
  sort_raw_relations(result)
}

///|
pub fn dedupe_resolved_relations(
  relations : Array[ResolvedRelation],
) -> Array[ResolvedRelation] {
  let deduped : Map[String, ResolvedRelation] = Map::new()
  for relation in sort_resolved_relations(relations) {
    deduped[resolved_relation_key(relation)] = relation
  }
  let result : Array[ResolvedRelation] = []
  deduped.each(fn(_key, relation) { result.push(relation) })
  sort_resolved_relations(result)
}
