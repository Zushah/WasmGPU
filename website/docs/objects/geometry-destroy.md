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
- [Geometry.boundsCenter](./geometry-boundscenter.md)
- [Geometry.boundsMax](./geometry-boundsmax.md)
- [Geometry.boundsMin](./geometry-boundsmin.md)
- [Geometry.boundsRadius](./geometry-boundsradius.md)
- [Geometry.indexBuffer](./geometry-indexbuffer.md)
- [Geometry.isIndexed](./geometry-isindexed.md)
- [Geometry.isSkinned](./geometry-isskinned.md)
- [Geometry.isSkinned8](./geometry-isskinned8.md)
- [Geometry.joints1Buffer](./geometry-joints1buffer.md)
- [Geometry.jointsBuffer](./geometry-jointsbuffer.md)
- [Geometry.normalBuffer](./geometry-normalbuffer.md)
- [Geometry.positionBuffer](./geometry-positionbuffer.md)
- [Geometry.clearWasmSources](./geometry-clearwasmsources.md)
