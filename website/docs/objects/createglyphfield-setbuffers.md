# createGlyphField#setBuffers

## Summary
createGlyphField#setBuffers replaces all CPU, raw-pointer, and WebAssembly-view instance sources with packed external GPU buffers, sets a positive `instanceCount`, and clears computed bounds. The supplied buffers are borrowed by default; pass `{ ownBuffers: true }` to transfer destruction responsibility to the glyph field.

Each non-null buffer must support storage binding and contain at least `instanceCount` packed `vec4<f32>` records; capacity and usage are caller preconditions. Positions, rotations, and scales are required. Attributes may be `null` when no per-instance attribute values are needed.

## Syntax
```ts
GlyphField.setBuffers(positions: GPUBuffer, rotations: GPUBuffer, scales: GPUBuffer, attributes: GPUBuffer | null, instanceCount: number, opts?: { ownBuffers?: boolean }): void
glyphField.setBuffers(positions, rotations, scales, attributes, instanceCount, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `positions` | `GPUBuffer` | Yes | Packed per-instance positions. |
| `rotations` | `GPUBuffer` | Yes | Packed per-instance quaternion rotations. |
| `scales` | `GPUBuffer` | Yes | Packed per-instance scales. |
| `attributes` | `GPUBuffer \| null` | Yes | Packed per-instance attribute values. |
| `instanceCount` | `number` | Yes | Number of instances represented by supplied data inputs. |
| `opts` | `{ ownBuffers?: boolean }` | No | Set `ownBuffers: true` to transfer destruction responsibility for every non-null supplied buffer. |

## Returns
`void`

## See Also
- [createGlyphField#destroy](./createglyphfield-destroy.md)
- [createGlyphField#setCPUData](./createglyphfield-setcpudata.md)
- [createGlyphField#setWasmPositions](./createglyphfield-setwasmpositions.md)
- [createGlyphField#setWasmSoA](./createglyphfield-setwasmsoa.md)
