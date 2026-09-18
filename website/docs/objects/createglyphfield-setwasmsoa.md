# createGlyphField#setWasmSoA

## Summary
createGlyphField#setWasmSoA replaces the field's data sources with raw pointers into WasmGPU's driver memory. Position, rotation, scale, and optional attribute channels use one packed `vec4<f32>` per instance. The field borrows the pointed-to allocations; the caller must keep them alive through `upload()`.

## Syntax
```ts
GlyphField.setWasmSoA(positionsPtr: WasmPtr, rotationsPtr: WasmPtr, scalesPtr: WasmPtr, attributesPtr: WasmPtr, instanceCount: number): void
glyphField.setWasmSoA(positionsPtr, rotationsPtr, scalesPtr, attributesPtr, instanceCount);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `positionsPtr` | `WasmPtr` | Yes | Pointer to `instanceCount * 4` position values `[x, y, z, unused]`. |
| `rotationsPtr` | `WasmPtr` | Yes | Pointer to `instanceCount * 4` quaternion values `[x, y, z, w]`. |
| `scalesPtr` | `WasmPtr` | Yes | Pointer to `instanceCount * 4` scale values `[sx, sy, sz, unused]`. |
| `attributesPtr` | `WasmPtr` | Yes | Pointer to `instanceCount * 4` attribute values, or `0` when the channel is absent. |
| `instanceCount` | `number` | Yes | Positive signed 32-bit number of packed records. |

## Type Details
### WasmPtr

```ts
type WasmPtr = number;
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const positions = wgpu.driver.heap.allocF32(4);
const rotations = wgpu.driver.heap.allocF32(4);
const scales = wgpu.driver.heap.allocF32(4);

positions.write([0, 0, 0, 0]);
rotations.write([0, 0, 0, 1]);
scales.write([1, 1, 1, 0]);

const glyphField = wgpu.createGlyphField({
    scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 }
});

try {
    glyphField.setWasmSoA(positions.ptr, rotations.ptr, scales.ptr, 0, 1);
    glyphField.upload(wgpu.gpu.device, wgpu.gpu.queue);
} finally {
    glyphField.destroy();
    positions.free();
    rotations.free();
    scales.free();
}
```

## See Also
- [WasmGPU.driver](../interop/wasmgpu-driver.md)
- [createGlyphField#upload](./createglyphfield-upload.md)
- [createGlyphField#destroy](./createglyphfield-destroy.md)
