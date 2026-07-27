# Geometry.upload

## Summary
Geometry.upload refreshes attached Wasm views and uploads pending CPU or Wasm data into geometry-owned GPU buffers. Borrowed Wasm allocations are never freed by the geometry.

## Syntax
```ts
Geometry.upload(device: GPUDevice): void
geometry.upload(device);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | `GPUDevice` | Yes | GPUDevice used to allocate pipelines, buffers, layouts, or textures. |

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

const geometry = wgpu.geometry.sphere(1, 24, 16);
const device = wgpu.gpu.device;
geometry.upload(device);
console.log(geometry.positionBuffer, geometry.indexBuffer);
geometry.destroy();
```

## See Also
- [Geometry.boundsCenter](./wasmgpu-objects-geometry-boundscenter.md)
- [Geometry.boundsMax](./wasmgpu-objects-geometry-boundsmax.md)
- [Geometry.boundsMin](./wasmgpu-objects-geometry-boundsmin.md)
- [Geometry.boundsRadius](./wasmgpu-objects-geometry-boundsradius.md)
- [Geometry.destroy](./wasmgpu-objects-geometry-destroy.md)
- [Geometry.indexBuffer](./wasmgpu-objects-geometry-indexbuffer.md)
- [Geometry.isIndexed](./wasmgpu-objects-geometry-isindexed.md)
- [Geometry.isSkinned](./wasmgpu-objects-geometry-isskinned.md)
- [Geometry.isSkinned8](./wasmgpu-objects-geometry-isskinned8.md)
- [Geometry.joints1Buffer](./wasmgpu-objects-geometry-joints1buffer.md)
- [Geometry.jointsBuffer](./wasmgpu-objects-geometry-jointsbuffer.md)
- [Geometry.normalBuffer](./wasmgpu-objects-geometry-normalbuffer.md)
- [Geometry.refreshFromWasm](./wasmgpu-objects-geometry-refreshfromwasm.md)
