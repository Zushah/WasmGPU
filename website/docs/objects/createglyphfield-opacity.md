# createGlyphField#opacity

## Summary
createGlyphField#opacity gets or sets global alpha. Assignment dirties uniforms; the stored number is unrestricted but packs clamped to `[0, 1]`.

## Syntax
```ts
GlyphField.opacity: number
const value = glyphField.opacity;
glyphField.opacity = 0.5;
```

## Returns
The stored opacity. This getter can return a value outside `[0, 1]`; uniform packing applies the clamp.

## See Also
- [createGlyphField#dirtyUniforms](./createglyphfield-dirtyuniforms.md)
- [createGlyphField#getUniformData](./createglyphfield-getuniformdata.md)
