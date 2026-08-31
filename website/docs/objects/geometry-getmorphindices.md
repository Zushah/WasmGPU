# Geometry.getMorphIndices

## Summary
Geometry.getMorphIndices returns the active index sequence used to expand indexed morph data, or `null` for non-indexed geometry.

## Syntax
```ts
Geometry.getMorphIndices(): Uint32Array | null
```

## Parameters
This method does not take parameters.

## Returns
`Uint32Array | null` - Active indices through `indexCount`, or `null` when the geometry is non-indexed.

## Type Details
A Wasm-backed index source is refreshed, range-validated, and copied before return. CPU-backed indices are returned as an active-range subarray, so callers that need an independent snapshot should copy the result.

## Example
```js
const geometry = wgpu.geometry.custom({
  positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
  indices: new Uint32Array([0, 1, 2]),
});

const indices = geometry.getMorphIndices();
console.log(indices ? Array.from(indices) : "non-indexed");
```

## Notes
Wasm-backed indices are refreshed and copied. CPU-backed results may be an active subarray view.

## See Also
- [Geometry.morphBaseRevision](./geometry-morphbaserevision.md)
- [Geometry.getMorphBaseChannel](./geometry-getmorphbasechannel.md)
