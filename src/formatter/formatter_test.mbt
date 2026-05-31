///|
test "format markdown normalizes paragraph wrapping for implemented subset" {
  inspect(
    format_markdown("# Title\nline one\nline two"),
    content=(
      #|# Title
      #|
      #|line one line two
    ),
  )
}
