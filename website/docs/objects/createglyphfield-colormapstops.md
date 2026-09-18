# createGlyphField#colormapStops

## Summary
createGlyphField#colormapStops gets or sets the two-to-eight normalized RGBA stops used by the `"custom"` colormap. Assignment copies and normalizes the list and emits a `"colormap"` event. The getter returns the stored array by reference; treat it as read-only and assign a new list to make a tracked change.

## Syntax
```ts
GlyphField.colormapStops: Color4[]
const value = glyphField.colormapStops;
glyphField.colormapStops = [[0, 0, 0, 1], [1, 0.5, 0, 1]];
```

## Returns
`Color4[]` - Stored normalized stop list, returned by reference.

## Type Details
### Color4

```ts
type Color4 = [number, number, number, number];
```

## See Also
- [createGlyphField#colormap](./createglyphfield-colormap.md)
- [createGlyphField#colorMode](./createglyphfield-colormode.md)
- [createGlyphField#getColormapForBinding](./createglyphfield-getcolormapforbinding.md)
