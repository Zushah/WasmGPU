# createGlyphField#markUniformsClean

## Summary
createGlyphField#markUniformsClean clears only the uniform dirty state after a custom integration has consumed the current uniform values. It does not affect instance-data or WebAssembly-channel dirtiness.

## Syntax
```ts
GlyphField.markUniformsClean(): void
glyphField.markUniformsClean();
```

## See Also
- [createGlyphField#dirtyUniforms](./createglyphfield-dirtyuniforms.md)
- [createGlyphField#markUniformsDirty](./createglyphfield-markuniformsdirty.md)
- [createGlyphField#getUniformData](./createglyphfield-getuniformdata.md)
