///|
pub struct RelationKindRule {
  stored : Bool
  inverse : String?
  deriveInverse : Bool?
  maxOutgoing : Int?
  acyclic : Bool?
} derive(Eq, Debug, ToJson, @json.FromJson)

///|
pub struct RelationPolicy {
  kinds : Map[String, RelationKindRule]
} derive(ToJson, @json.FromJson)

///|
fn default_rule(kind : String) -> RelationKindRule {
  match kind {
    "parent" =>
      {
        stored: true,
        inverse: Some("child"),
        deriveInverse: Some(true),
        maxOutgoing: Some(1),
        acyclic: Some(true),
      }
    "child" =>
      {
        stored: false,
        inverse: Some("parent"),
        deriveInverse: None,
        maxOutgoing: None,
        acyclic: None,
      }
    "reference" =>
      {
        stored: true,
        inverse: Some("backlink"),
        deriveInverse: Some(true),
        maxOutgoing: None,
        acyclic: None,
      }
    "backlink" =>
      {
        stored: false,
        inverse: Some("reference"),
        deriveInverse: None,
        maxOutgoing: None,
        acyclic: None,
      }
    "dependency" =>
      {
        stored: true,
        inverse: None,
        deriveInverse: None,
        maxOutgoing: None,
        acyclic: Some(true),
      }
    "sequence" =>
      { stored: true, inverse: None, deriveInverse: None, maxOutgoing: None, acyclic: None }
    "tag" =>
      { stored: true, inverse: None, deriveInverse: None, maxOutgoing: None, acyclic: None }
    _ =>
      { stored: false, inverse: None, deriveInverse: None, maxOutgoing: None, acyclic: None }
  }
}

///|
pub fn papyr_relation_policy() -> RelationPolicy {
  let kinds : Map[String, RelationKindRule] = Map::new()
  for kind in ["parent", "child", "reference", "backlink", "dependency", "sequence", "tag"] {
    kinds[kind] = default_rule(kind)
  }
  { kinds }
}

///|
fn option_string_or(value : String?, fallback : String?) -> String? {
  match value {
    Some(_) => value
    None => fallback
  }
}

///|
fn option_bool_or(value : Bool?, fallback : Bool?) -> Bool? {
  match value {
    Some(_) => value
    None => fallback
  }
}

///|
fn option_int_or(value : Int?, fallback : Int?) -> Int? {
  match value {
    Some(_) => value
    None => fallback
  }
}

///|
fn merge_rule(base : RelationKindRule, rule_override : RelationKindRule?) -> RelationKindRule {
  match rule_override {
    None => base
    Some(rule) =>
      {
        stored: rule.stored,
        inverse: option_string_or(rule.inverse, base.inverse),
        deriveInverse: option_bool_or(rule.deriveInverse, base.deriveInverse),
        maxOutgoing: option_int_or(rule.maxOutgoing, base.maxOutgoing),
        acyclic: option_bool_or(rule.acyclic, base.acyclic),
      }
  }
}

///|
pub fn create_relation_policy(
  overrides : Map[String, RelationKindRule]?,
) -> RelationPolicy {
  let policy = papyr_relation_policy()
  match overrides {
    None => policy
    Some(items) => {
      let kinds : Map[String, RelationKindRule] = Map::new()
      for kind in ["parent", "child", "reference", "backlink", "dependency", "sequence", "tag"] {
        kinds[kind] = merge_rule(default_rule(kind), items.get(kind))
      }
      { kinds }
    }
  }
}

///|
pub fn get_relation_kind_rule(
  policy : RelationPolicy,
  kind : String,
) -> RelationKindRule {
  policy.kinds.get(kind).unwrap_or(default_rule(kind))
}

///|
pub fn get_inverse_relation_kind(policy : RelationPolicy, kind : String) -> String? {
  get_relation_kind_rule(policy, kind).inverse
}

///|
pub fn should_derive_inverse(policy : RelationPolicy, kind : String) -> Bool {
  get_relation_kind_rule(policy, kind).deriveInverse.unwrap_or(false)
}

///|
pub fn get_max_outgoing_relations(policy : RelationPolicy, kind : String) -> Int? {
  get_relation_kind_rule(policy, kind).maxOutgoing
}

///|
pub fn is_acyclic_relation_kind(policy : RelationPolicy, kind : String) -> Bool {
  get_relation_kind_rule(policy, kind).acyclic.unwrap_or(false)
}
