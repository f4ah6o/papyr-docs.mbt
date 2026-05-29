///|
test "element_to_moonlight_svg serializes image with editable metadata" {
  let image = @model.Element::new(
    "image-1",
    10.0,
    20.0,
    @model.Image("data:image/png;base64,AAA=", 120.0, 80.0),
  )
  let svg = element_to_moonlight_svg(image)
  assert_true(svg.contains("<image"))
  assert_true(svg.contains("data-id=\"image-1\""))
  assert_true(svg.contains("href=\"data:image/png;base64,AAA=\""))
  assert_true(svg.contains("x=\"10"))
  assert_true(svg.contains("y=\"20"))
  assert_true(svg.contains("width=\"120"))
  assert_true(svg.contains("height=\"80"))
  assert_true(svg.contains("preserveAspectRatio=\"none\""))
}

///|
test "elements_to_moonlight_svg keeps embedded image editable" {
  let image = @model.Element::new(
    "image-1",
    4.0,
    8.0,
    @model.Image("data:image/png;base64,BBB=", 32.0, 24.0),
  )
  let svg = elements_to_moonlight_svg([image], 640, 480, "#ffffff")
  assert_true(svg.contains("data-moonlight=\"1.0\""))
  assert_true(svg.contains("<image"))
  assert_true(svg.contains("data-id=\"image-1\""))
  assert_true(svg.contains("href=\"data:image/png;base64,BBB=\""))
}
