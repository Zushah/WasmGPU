# Geometry.morphBaseRevision

## Summary
Geometry.morphBaseRevision changes whenever base vertex or index data used by morph deformation is replaced or refreshed.

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
Use this revision only for cache invalidation. It wraps as an unsigned 32-bit counter and does not identify a global geometry version.

## See Also
- [Geometry.getMorphBaseChannel](./geometry-getmorphbasechannel.md)
- [Geometry.getMorphIndices](./geometry-getmorphindices.md)
- [WasmGPU.geometry.custom](./wasmgpu-geometry-custom.md)
