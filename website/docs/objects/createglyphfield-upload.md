# createGlyphField#upload

## Summary
createGlyphField#upload copies dirty CPU and WebAssembly-backed channels into GPU storage owned by the field. Borrowed external-buffer channels are used directly rather than copied. CPU snapshots are discarded after upload unless retention is enabled.

## Syntax
```ts
GlyphField.upload(device: GPUDevice, queue: GPUQueue): void
glyphField.upload(device, queue);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | `GPUDevice` | Yes | Device that owns field-created storage buffers. |
| `queue` | `GPUQueue` | Yes | Queue used to copy active records into existing buffers. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const device = wgpu.gpu.device;
const queue = wgpu.gpu.queue;
glyphField.upload(device, queue);
console.log(glyphField.positionsBuffer !== null); // true
```

## See Also
- [createGlyphField#setCPUData](./createglyphfield-setcpudata.md)
- [createGlyphField#refreshFromWasm](./createglyphfield-refreshfromwasm.md)
- [createGlyphField#destroy](./createglyphfield-destroy.md)
