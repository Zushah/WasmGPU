# geometry#morphBaseRevision

## Summary
geometry#morphBaseRevision changes whenever base vertex or index data used by morph deformation is replaced or refreshed.

## Syntax
```ts
Geometry.morphBaseRevision: number
```

## Parameters
This read-only property does not take parameters.

## Returns
`number` - Current unsigned 32-bit morph-base revision.

## Type Details
The counter advances when base positions, normals, colors, or indices are replaced or refreshed through the public geometry update paths. It wraps with unsigned 32-bit arithmetic, so compare it for equality rather than ordering or elapsed-change counts.

## Example
```js
const before = geometry.morphBaseRevision;
// After the application writes new values into the attached Wasm sources:
geometry.refreshFromWasm();

if (geometry.morphBaseRevision !== before) {
  cachedMorphData = geometry.getMorphBaseChannel("positions").slice();
}
```

## Notes
Use this revision only to detect whether morph-base data changed. It wraps as an unsigned 32-bit counter and does not identify a global geometry version.

## See Also
- [geometry#getMorphBaseChannel](./geometry-getmorphbasechannel.md)
- [geometry#getMorphIndices](./geometry-getmorphindices.md)
- [geometry.custom](./geometry-custom.md)
