# GlyphField.setBuffers

## Summary
The supplied instance buffers are borrowed by default. Pass `{ ownBuffers: true }` to transfer destruction responsibility to the glyphfield.
The call replaces CPU and Wasm instance sources, sets `instanceCount`, and clears retained instance records.

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
`void` - No return value. The call applies side effects to runtime state and/or GPU resources.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
// GPUBuffer objects prepared by the application:
glyphField.setBuffers(
    positionsBuffer,
    rotationsBuffer,
    scalesBuffer,
    attributesBuffer,
    1,
    { ownBuffers: false }
);
```

## See Also
- [GlyphField.applyScaleStats](./glyphfield-applyscalestats.md)
- [GlyphField.colormap](./glyphfield-colormap.md)
- [GlyphField.colormapStops](./glyphfield-colormapstops.md)
- [GlyphField.colorMode](./glyphfield-colormode.md)
- [GlyphField.computeBoundsFromCPUData](./glyphfield-computeboundsfromcpudata.md)
- [GlyphField.destroy](./glyphfield-destroy.md)
- [GlyphField.dirtyUniforms](./glyphfield-dirtyuniforms.md)
- [GlyphField.getAttributeRecord](./glyphfield-getattributerecord.md)
- [GlyphField.getBounds](./glyphfield-getbounds.md)
- [GlyphField.getColormapForBinding](./glyphfield-getcolormapforbinding.md)
- [GlyphField.getColormapKey](./glyphfield-getcolormapkey.md)
- [GlyphField.getLocalBounds](./glyphfield-getlocalbounds.md)
