# GlyphField.setWasmSoA

## Summary
GlyphField.setWasmSoA updates wasm so a state on this GlyphField and marks dependent GPU data for refresh.

## Syntax
```ts
GlyphField.setWasmSoA(positionsPtr: WasmPtr, rotationsPtr: WasmPtr, scalesPtr: WasmPtr, attributesPtr: WasmPtr, instanceCount: number): void
glyphField.setWasmSoA(positionsPtr, rotationsPtr, scalesPtr, attributesPtr, instanceCount);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `positionsPtr` | `WasmPtr` | Yes | Wasm pointer to positions SoA data. |
| `rotationsPtr` | `WasmPtr` | Yes | Wasm pointer to rotations SoA data. |
| `scalesPtr` | `WasmPtr` | Yes | Wasm pointer to scales SoA data. |
| `attributesPtr` | `WasmPtr` | Yes | Wasm pointer to attributes SoA data. |
| `instanceCount` | `number` | Yes | Number of instances represented by supplied data inputs. |

## Returns
`void` - No return value. The call applies side effects to runtime state and/or GPU resources.

## Type Details
### WasmPtr

```ts
type WasmPtr = number;
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const positionsPtr = 0;
const rotationsPtr = 0;
const scalesPtr = 0;
const attributesPtr = 0;
const instanceCount = 1;
glyphField.setWasmSoA(positionsPtr, rotationsPtr, scalesPtr, attributesPtr, instanceCount);
console.log("updated");
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
