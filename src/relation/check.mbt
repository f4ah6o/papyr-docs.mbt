///|
pub struct RelationDiagnostic {
  code : String
  message : String
  documentId : String?
  relation : RawRelation?
  relatedDocumentIds : Array[String]?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub struct CheckRelationsOptions {
  documentIds : Array[String]
  relations : Array[RawRelation]
  policy : RelationPolicy?
} derive(ToJson, @json.FromJson)

///|
pub struct CheckRelationsResult {
  relations : Array[RawRelation]
  diagnostics : Array[RelationDiagnostic]
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
fn sorted_unique_strings(values : Array[String]) -> Array[String] {
  let seen : Map[String, Bool] = Map::new()
  for value in values {
    seen[value] = true
  }
  let result : Array[String] = []
  seen.each(fn(value, _) { result.push(value) })
  result.sort()
  result
}

///|
fn compare_diagnostics(left : RelationDiagnostic, right : RelationDiagnostic) -> Int {
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
pub fn check_relations(options : CheckRelationsOptions) -> CheckRelationsResult {
  let policy = options.policy.unwrap_or(papyr_relation_policy())
  let document_ids = sorted_unique_strings(options.documentIds)
  let documents : Map[String, Bool] = Map::new()
  for id in document_ids {
    documents[id] = true
  }
  let diagnostics : Array[RelationDiagnostic] = []
  let normalized : Array[RawRelation] = []
  for relation in sort_raw_relations(options.relations) {
    if !documents.contains(relation.source) {
      diagnostics.push({
        code: "RELATION_SOURCE_MISSING",
        message: "relation source \"\{relation.source}\" does not exist",
        documentId: Some(relation.source),
        relation: Some(relation),
        relatedDocumentIds: None,
      })
      continue
    }
    if !documents.contains(relation.target) {
      diagnostics.push({
        code: "RELATION_TARGET_MISSING",
        message: "relation target \"\{relation.target}\" does not exist",
        documentId: Some(relation.target),
        relation: Some(relation),
        relatedDocumentIds: None,
      })
      continue
    }
    if !is_stored_relation_kind(relation.rel) {
      diagnostics.push({
        code: "RELATION_KIND_UNKNOWN",
        message: "relation kind \"\{relation.rel}\" is not allowed in raw relation storage",
        documentId: None,
        relation: Some(relation),
        relatedDocumentIds: None,
      })
      continue
    }
    normalized.push(relation)
  }
  let relations = dedupe_raw_relations(normalized)
  for diagnostic in collect_duplicate_parent_diagnostics(relations, policy) {
    diagnostics.push(diagnostic)
  }
  for diagnostic in collect_cycle_diagnostics(relations, policy) {
    diagnostics.push(diagnostic)
  }
  diagnostics.sort_by(compare_diagnostics)
  { relations, diagnostics }
}

///|
fn collect_duplicate_parent_diagnostics(
  relations : Array[RawRelation],
  policy : RelationPolicy,
) -> Array[RelationDiagnostic] {
  let max_outgoing = get_max_outgoing_relations(policy, "parent")
  match max_outgoing {
    None => []
    Some(limit) => {
      let targets_by_document : Map[String, Array[String]] = Map::new()
      for relation in relations {
        if relation.rel == "parent" {
          let targets = targets_by_document.get(relation.source).unwrap_or([])
          targets.push(relation.target)
          targets_by_document[relation.source] = targets
        }
      }
      let diagnostics : Array[RelationDiagnostic] = []
      targets_by_document.each(fn(document_id, targets) {
        let unique_targets = sorted_unique_strings(targets)
        if unique_targets.length() > limit {
          diagnostics.push({
            code: "RELATION_DUPLICATE_PARENT",
            message: "document \"\{document_id}\" has multiple parent relations",
            documentId: Some(document_id),
            relation: None,
            relatedDocumentIds: Some(unique_targets),
          })
        }
      })
      diagnostics
    }
  }
}

///|
fn collect_cycle_diagnostics(
  relations : Array[RawRelation],
  policy : RelationPolicy,
) -> Array[RelationDiagnostic] {
  let diagnostics : Array[RelationDiagnostic] = []
  for kind in ["parent", "dependency"] {
    if is_acyclic_relation_kind(policy, kind) {
      let kind_relations : Array[RawRelation] = []
      for relation in relations {
        if relation.rel == kind {
          kind_relations.push(relation)
        }
      }
      for cycle in find_cycles(kind_relations) {
        diagnostics.push({
          code: if kind == "parent" {
            "RELATION_TREE_CYCLE"
          } else {
            "RELATION_DEPENDENCY_CYCLE"
          },
          message: "relation cycle detected: \{cycle.join(" -> ")}",
          documentId: cycle.get(0),
          relation: None,
          relatedDocumentIds: Some(cycle),
        })
      }
    }
  }
  diagnostics
}

///|
priv struct CycleFrame {
  node : String
  nextIndex : Int
  targets : Array[String]
}

///|
fn find_cycles(relations : Array[RawRelation]) -> Array[Array[String]] {
  let adjacency : Map[String, Array[String]] = Map::new()
  for relation in relations {
    let targets = adjacency.get(relation.source).unwrap_or([])
    targets.push(relation.target)
    adjacency[relation.source] = sorted_unique_strings(targets)
  }
  let nodes : Array[String] = []
  adjacency.each(fn(node, _) { nodes.push(node) })
  nodes.sort()
  let visited : Map[String, Bool] = Map::new()
  let visiting : Map[String, Bool] = Map::new()
  let path : Array[String] = []
  let cycles : Map[String, Array[String]] = Map::new()
  for node in nodes {
    if visited.contains(node) {
      continue
    }
    let stack : Array[CycleFrame] = []
    visiting[node] = true
    path.push(node)
    stack.push({ node, nextIndex: 0, targets: adjacency.get(node).unwrap_or([]) })
    while stack.length() > 0 {
      let frame_index = stack.length() - 1
      let frame = stack[frame_index]
      if frame.nextIndex >= frame.targets.length() {
        ignore(stack.pop())
        ignore(path.pop())
        visiting.remove(frame.node)
        visited[frame.node] = true
        continue
      }
      let next = frame.targets[frame.nextIndex]
      stack[frame_index] = { node: frame.node, nextIndex: frame.nextIndex + 1, targets: frame.targets }
      if visiting.contains(next) {
        let mut cycle_start = -1
        for i, value in path {
          if value == next && cycle_start < 0 {
            cycle_start = i
          }
        }
        if cycle_start >= 0 {
          let cycle : Array[String] = []
          for i in cycle_start..<path.length() {
            cycle.push(path[i])
          }
          cycle.push(next)
          cycles[canonicalize_cycle(cycle)] = cycle
        }
        continue
      }
      if visited.contains(next) {
        continue
      }
      visiting[next] = true
      path.push(next)
      stack.push({ node: next, nextIndex: 0, targets: adjacency.get(next).unwrap_or([]) })
    }
  }
  let result : Array[Array[String]] = []
  cycles.each(fn(_, cycle) { result.push(cycle) })
  result.sort_by(fn(left, right) { compare_string_ascending(left.join("\u{0000}"), right.join("\u{0000}")) })
  result
}

///|
fn canonicalize_cycle(cycle : Array[String]) -> String {
  if cycle.length() <= 1 {
    return ""
  }
  let body_length = cycle.length() - 1
  let rotations : Array[String] = []
  for index in 0..<body_length {
    let rotated : Array[String] = []
    for offset in 0..<body_length {
      rotated.push(cycle[(index + offset) % body_length])
    }
    rotated.push(rotated[0])
    rotations.push(rotated.join("\u{0000}"))
  }
  rotations.sort()
  rotations[0]
}
