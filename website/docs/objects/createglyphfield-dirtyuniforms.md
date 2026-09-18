# createGlyphField#dirtyUniforms

## Summary
createGlyphField#dirtyUniforms reports whether scale/color/lighting uniform data must be rewritten. `markUniformsDirty()` sets it and `markUniformsClean()` clears it; data-channel dirtiness is tracked separately.

## Syntax
```ts
GlyphField.dirtyUniforms: boolean
const value = glyphField.dirtyUniforms;
```

## Returns
`true` when the uniform payload needs to be consumed again; otherwise `false`.

## See Also
- [createGlyphField#getUniformData](./createglyphfield-getuniformdata.md)
- [createGlyphField#markUniformsClean](./createglyphfield-markuniformsclean.md)
- [createGlyphField#markUniformsDirty](./createglyphfield-markuniformsdirty.md)
