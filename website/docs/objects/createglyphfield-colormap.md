# createGlyphField#colormap

## Summary
createGlyphField#colormap gets or sets the texture/custom colormap used by scalar mode. Assignment affects subsequent scalar-color rendering and emits a `"colormap"` event.

## Syntax
```ts
GlyphField.colormap: GlyphColormap | Colormap
const value = glyphField.colormap;
glyphField.colormap = "magma";
```

## Returns
`GlyphColormap | Colormap` - Current built-in/custom selection or borrowed `Colormap` instance.

## Type Details
### GlyphColormap

```ts
type GlyphColormap = BuiltinColormapName | "custom";
```

### BuiltinColormapName

```ts
type BuiltinColormapName = "grayscale" | "turbo" | "viridis" | "magma" | "plasma" | "inferno";
```

## See Also
- [createGlyphField#colormapStops](./createglyphfield-colormapstops.md)
- [createGlyphField#colorMode](./createglyphfield-colormode.md)
- [createGlyphField#getColormapForBinding](./createglyphfield-getcolormapforbinding.md)
