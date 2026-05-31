///|
pub fn format_markdown(source : String) -> String {
  @markdown.document_to_markdown(@markdown.parse_markdown(source))
}

///|
pub fn format_document(doc : @core.PapyrDocument) -> String {
  @markdown.document_to_markdown(doc)
}
