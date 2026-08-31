# Geometry.getMorphBaseChannel

## Summary
Geometry.getMorphBaseChannel returns active base positions, normals, or RGBA colors for morph processing. Wasm-backed channels are refreshed and copied before return.

## Syntax
```ts
Geometry.getMorphBaseChannel(channel: "positions" | "normals" | "colors"): Float32Array
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `channel` | `"positions" \| "normals" \| "colors"` | Yes | Base vertex channel to retrieve. |

## Returns
`Float32Array` - Active base-channel data for the current `vertexCount`.

## Type Details
Positions and normals contain three `f32` components per vertex; colors contain four RGBA components. A Wasm-backed source is refreshed, range-validated, and copied. A sufficiently large CPU channel is returned as an active-range subarray. Missing normals default to `[0, 1, 0]` per vertex, missing colors default to white, and missing positions throw.

## Example
```js
const geometry = wgpu.geometry.custom({
  positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
});

const basePositions = geometry.getMorphBaseChannel("positions");
const baseNormals = geometry.getMorphBaseChannel("normals");
console.log(basePositions.length, baseNormals.length); // 9 9
```

## Notes
Positions are required. Missing normals and colors return generated fallback arrays. CPU-backed results may be active subarray views; do not assume ownership of their backing buffer.

## See Also
- [Geometry.morphBaseRevision](./geometry-morphbaserevision.md)
- [Geometry.getMorphIndices](./geometry-getmorphindices.md)
