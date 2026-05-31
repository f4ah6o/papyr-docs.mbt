///|
pub struct ResolveRelationsOptions {
  documentIds : Array[String]
  relations : Array[RawRelation]
  policy : RelationPolicy?
} derive(ToJson, @json.FromJson)

///|
pub struct ResolveRelationsResult {
  relations : Array[RawRelation]
  resolvedRelations : Array[ResolvedRelation]
  diagnostics : Array[RelationDiagnostic]
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub fn resolve_relations(options : ResolveRelationsOptions) -> ResolveRelationsResult {
  let policy = options.policy.unwrap_or(papyr_relation_policy())
  let checked = check_relations({
    documentIds: options.documentIds,
    relations: options.relations,
    policy: Some(policy),
  })
  let resolved : Array[ResolvedRelation] = []
  for relation in checked.relations {
    resolved.push({
      source: relation.source,
      target: relation.target,
      rel: relation.rel,
      metadata: relation.metadata,
      derived: false,
    })
    if should_derive_inverse(policy, relation.rel) {
      match get_inverse_relation_kind(policy, relation.rel) {
        Some(inverse) =>
          resolved.push({
            source: relation.target,
            target: relation.source,
            rel: inverse,
            metadata: relation.metadata,
            derived: true,
          })
        None => ()
      }
    }
  }
  {
    relations: checked.relations,
    resolvedRelations: sort_resolved_relations(dedupe_resolved_relations(resolved)),
    diagnostics: checked.diagnostics,
  }
}
