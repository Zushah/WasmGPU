# createGlyphField#getColormapKey

## Summary
createGlyphField#getColormapKey returns an opaque string that is equal for equivalent colormap selections. Use it only for equality checks; do not parse or persist it.

## Syntax
```ts
GlyphField.getColormapKey(): string
const result = glyphField.getColormapKey();
```

## Returns
An opaque identity string for the current colormap selection.

## See Also
- [createGlyphField#colormap](./createglyphfield-colormap.md)
- [createGlyphField#getColormapForBinding](./createglyphfield-getcolormapforbinding.md)
