# createGlyphField#ndShape

## Summary
createGlyphField#ndShape gets or sets the optional logical picking shape. Dimensions must be positive signed 32-bit integers; assignment and retrieval copy the array, `null` or an empty array clears it, and its product is not required to equal `instanceCount`.

## Syntax
```ts
GlyphField.ndShape: number[] | null
const value = glyphField.ndShape;
glyphField.ndShape = [128, 256];
```

## Returns
`number[] | null` - Copied logical shape, or `null` when no shape is assigned.

## See Also
- [createGlyphField#mapLinearIndexToNd](./createglyphfield-maplinearindextond.md)
- [createGlyphField#instanceCount](./createglyphfield-instancecount.md)
