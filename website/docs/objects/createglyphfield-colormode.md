# createGlyphField#colorMode

## Summary
createGlyphField#colorMode gets or sets `"rgba"`, `"scalar"`, or `"solid"` shading. `"rgba"` and `"scalar"` require a compatible attribute buffer to be installed before rendering; `"solid"` uses `solidColor`. Assignment dirties uniforms.

## Syntax
```ts
GlyphField.colorMode: GlyphColorMode
const value = glyphField.colorMode;
glyphField.colorMode = "scalar";
```

## Returns
`"rgba" | "scalar" | "solid"` - Current glyph coloring mode.

## Type Details
### GlyphColorMode

```ts
type GlyphColorMode = "rgba" | "scalar" | "solid";
```

## See Also
- [createGlyphField#colormap](./createglyphfield-colormap.md)
- [createGlyphField#colormapStops](./createglyphfield-colormapstops.md)
- [createGlyphField#solidColor](./createglyphfield-solidcolor.md)
