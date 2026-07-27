# GlyphField.setCPUData

## Summary
`GlyphField.setCPUData()` installs all four CPU channel arrays. `setWasmInstances()` is its memory-safe WebAssembly counterpart for attaching several `WasmMemoryView` channels at once.

## Syntax
```ts
GlyphField.setCPUData(positions: Float32Array | null, rotations: Float32Array | null, scales: Float32Array | null, attributes: Float32Array | null, opts?: { keepCPUData?: boolean; instanceCount?: number }): void
GlyphField.setWasmInstances(sources: GlyphFieldWasmSources, options?: GlyphFieldWasmInstancesOptions): void
glyphField.setCPUData(positions, rotations, scales, attributes, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `positions` | `Float32Array \| null` | Yes | Packed per-instance positions. |
| `rotations` | `Float32Array \| null` | Yes | Packed per-instance quaternion rotations. |
| `scales` | `Float32Array \| null` | Yes | Packed per-instance scales. |
| `attributes` | `Float32Array \| null` | Yes | Packed per-instance attribute values. |
| `opts` | `{ keepCPUData?: boolean; instanceCount?: number }` | No | Optional configuration object that customizes behavior for this call. |
| `sources` | `GlyphFieldWasmSources` | Yes | Optional `positions`, `rotations`, `scales`, and `attributes` views; explicit `null` detaches a channel. |
| `options` | `GlyphFieldWasmInstancesOptions` | No | Active count, capacity hint, CPU retention, and bounds-recomputation controls. |

## Returns
`void` - No return value. The call applies side effects to runtime state and/or GPU resources.

## Type Details
### SetCPUDataopts

```ts
type SetCPUDataopts = {

    keepCPUData?: boolean;

    instanceCount?: number;

};
```

#### SetCPUDataopts Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `keepCPUData` | `boolean` | No | When true, CPU arrays are retained after upload. |
| `instanceCount` | `number` | No | Number of instances represented by supplied data inputs. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const positions = new Float32Array([0, 0, 0, 0]);
const rotations = new Float32Array([0, 0, 0, 1]);
const scales = new Float32Array([1, 1, 1, 0]);
const attributes = new Float32Array([0.5, 0, 0, 0]);
const opts = { keepCPUData: true, instanceCount: 1 };
glyphField.setCPUData(positions, rotations, scales, attributes, opts);
console.log("updated");
```

## See Also
- [GlyphField.setWasmPositions](./wasmgpu-objects-glyphfield-setwasmpositions.md)
- [GlyphField.setWasmRotations](./wasmgpu-objects-glyphfield-setwasmrotations.md)
- [GlyphField.setWasmScales](./wasmgpu-objects-glyphfield-setwasmscales.md)
- [GlyphField.setWasmAttributes](./wasmgpu-objects-glyphfield-setwasmattributes.md)
- [GlyphField.setWasmSoA](./wasmgpu-objects-glyphfield-setwasmsoa.md)
- [GlyphField.refreshFromWasm](./wasmgpu-objects-glyphfield-refreshfromwasm.md)
- [GlyphField.clearWasmSources](./wasmgpu-objects-glyphfield-clearwasmsources.md)
- [GlyphField.applyScaleStats](./wasmgpu-objects-glyphfield-applyscalestats.md)
- [GlyphField.colormap](./wasmgpu-objects-glyphfield-colormap.md)
- [GlyphField.colormapStops](./wasmgpu-objects-glyphfield-colormapstops.md)
- [GlyphField.colorMode](./wasmgpu-objects-glyphfield-colormode.md)
- [GlyphField.computeBoundsFromCPUData](./wasmgpu-objects-glyphfield-computeboundsfromcpudata.md)
- [GlyphField.destroy](./wasmgpu-objects-glyphfield-destroy.md)
- [GlyphField.dirtyUniforms](./wasmgpu-objects-glyphfield-dirtyuniforms.md)
- [GlyphField.getAttributeRecord](./wasmgpu-objects-glyphfield-getattributerecord.md)
- [GlyphField.getBounds](./wasmgpu-objects-glyphfield-getbounds.md)
- [GlyphField.getColormapForBinding](./wasmgpu-objects-glyphfield-getcolormapforbinding.md)
- [GlyphField.getColormapKey](./wasmgpu-objects-glyphfield-getcolormapkey.md)
- [GlyphField.getLocalBounds](./wasmgpu-objects-glyphfield-getlocalbounds.md)
