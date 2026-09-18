# createGlyphField#instanceCount

## Summary
createGlyphField#instanceCount gets or sets the active instance count. Assign a non-negative signed 32-bit integer and ensure every active data source contains at least that many records. Changing the count does not resize external sources.

## Syntax
```ts
GlyphField.instanceCount: number
const value = glyphField.instanceCount;
glyphField.instanceCount = 1024;
```

## Returns
`number` - Active glyph-instance count.

## See Also
- [createGlyphField#getAttributeRecord](./createglyphfield-getattributerecord.md)
- [createGlyphField#setCPUData](./createglyphfield-setcpudata.md)
