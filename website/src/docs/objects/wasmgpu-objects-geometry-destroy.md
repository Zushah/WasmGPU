# Geometry.destroy

## Summary
Geometry.destroy delegates to the reference-counted `release()` lifecycle. When the final reference is released, it destroys geometry-owned GPU buffers and marks the geometry destroyed. It never frees borrowed external Wasm allocations.

Call `clearWasmSources()` separately if a still-live shared geometry should detach its external sources before the final release. Calling `destroy()` after the geometry has already reached zero references throws.

## Syntax
```ts
Geometry.destroy(): void
geometry.destroy();
```

## Parameters
This API does not take parameters.

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
geometry.destroy();
```

## See Also
- [Geometry.boundsCenter](./wasmgpu-objects-geometry-boundscenter.md)
- [Geometry.boundsMax](./wasmgpu-objects-geometry-boundsmax.md)
- [Geometry.boundsMin](./wasmgpu-objects-geometry-boundsmin.md)
- [Geometry.boundsRadius](./wasmgpu-objects-geometry-boundsradius.md)
- [Geometry.indexBuffer](./wasmgpu-objects-geometry-indexbuffer.md)
- [Geometry.isIndexed](./wasmgpu-objects-geometry-isindexed.md)
- [Geometry.isSkinned](./wasmgpu-objects-geometry-isskinned.md)
- [Geometry.isSkinned8](./wasmgpu-objects-geometry-isskinned8.md)
- [Geometry.joints1Buffer](./wasmgpu-objects-geometry-joints1buffer.md)
- [Geometry.jointsBuffer](./wasmgpu-objects-geometry-jointsbuffer.md)
- [Geometry.normalBuffer](./wasmgpu-objects-geometry-normalbuffer.md)
- [Geometry.positionBuffer](./wasmgpu-objects-geometry-positionbuffer.md)
- [Geometry.clearWasmSources](./wasmgpu-objects-geometry-clearwasmsources.md)
