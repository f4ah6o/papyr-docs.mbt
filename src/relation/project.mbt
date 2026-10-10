///|
pub struct ProjectRelationOptions {
  documentIds : Array[String]
  relations : Array[ResolvedRelation]
} derive(ToJson, @json.FromJson)

///|
pub struct TreeProjectionNode {
  id : String
  parentId : String?
  childIds : Array[String]
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub struct TreeProjection {
  roots : Array[String]
  leafRoots : Array[String]
  nodes : Map[String, TreeProjectionNode]
} derive(ToJson, @json.FromJson)

///|
pub struct GraphEdge {
  source : String
  target : String
  rel : String
  derived : Bool
  metadata : RelationMetadata?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
struct ChildEdge {
  childId : String
  order : Double
} derive(Eq, Debug)

///|
fn compare_child_edges(left : ChildEdge, right : ChildEdge) -> Int {
  if left.order < right.order {
    -1
  } else if left.order > right.order {
    1
  } else {
    compare_string_ascending(left.childId, right.childId)
  }
}

///|
pub fn project_tree(options : ProjectRelationOptions) -> TreeProjection {
  let document_ids = sorted_unique_strings(options.documentIds)
  let nodes : Map[String, TreeProjectionNode] = Map::new()
  for id in document_ids {
    nodes[id] = { id, parentId: None, childIds: [], }
  }
  let child_edges_by_parent : Map[String, Array[ChildEdge]] = Map::new()
  let parent_by_child : Map[String, String] = Map::new()
  for relation in sort_resolved_relations(options.relations) {
    if relation.rel != "child" ||
      !nodes.contains(relation.source) ||
      !nodes.contains(relation.target) {
      continue
    }
    if !parent_by_child.contains(relation.target) {
      let child_node = nodes[relation.target]
      parent_by_child[relation.target] = relation.source
      nodes[relation.target] = {
        id: child_node.id,
        parentId: Some(relation.source),
        childIds: child_node.childIds,
      }
    }
    let edges = child_edges_by_parent.get(relation.source).unwrap_or([])
    edges.push({
      childId: relation.target,
      order: metadata_order(relation.metadata),
    })
    child_edges_by_parent[relation.source] = edges
  }
  child_edges_by_parent.each(fn(parent_id, edges) {
    let parent_node = nodes[parent_id]
    edges.sort_by(compare_child_edges)
    let child_ids : Array[String] = []
    for edge in edges {
      child_ids.push(edge.childId)
    }
    nodes[parent_id] = {
      id: parent_node.id,
      parentId: parent_node.parentId,
      childIds: child_ids,
    }
  })
  let roots : Array[String] = []
  let leaf_roots : Array[String] = []
  for id in document_ids {
    let node = nodes[id]
    if node.parentId == None {
      roots.push(id)
      if node.childIds.length() == 0 {
        leaf_roots.push(id)
      }
    }
  }
  { roots, leafRoots: leaf_roots, nodes, }
}

///|
pub fn project_backlinks(
  options : ProjectRelationOptions,
) -> Map[String, Array[String]] {
  let backlinks : Map[String, Array[String]] = Map::new()
  for id in sorted_unique_strings(options.documentIds) {
    backlinks[id] = []
  }
  for relation in sort_resolved_relations(options.relations) {
    if relation.rel == "backlink" &&
      backlinks.contains(relation.source) &&
      backlinks.contains(relation.target) {
      let items = backlinks[relation.source]
      items.push(relation.target)
      backlinks[relation.source] = items
    }
  }
  let result : Map[String, Array[String]] = Map::new()
  backlinks.each(fn(document_id, items) {
    result[document_id] = sorted_unique_strings(items)
  })
  result
}

///|
pub fn project_graph(relations : Array[ResolvedRelation]) -> Array[GraphEdge] {
  let edges : Array[GraphEdge] = []
  for relation in sort_resolved_relations(relations) {
    edges.push({
      source: relation.source,
      target: relation.target,
      rel: relation.rel,
      derived: relation.derived,
      metadata: relation.metadata,
    })
  }
  edges
}
