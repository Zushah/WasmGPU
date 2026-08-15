# Geometry.jointsBuffer

## Summary
Geometry.jointsBuffer reads the current `jointsBuffer` value from this Geometry instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
Geometry.jointsBuffer: GPUBuffer | null
const value = geometry.jointsBuffer;
```

## Parameters
This API does not take parameters.

## Returns
`GPUBuffer | null` - Current accessor value exposed by the runtime object.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const geometry = wgpu.geometry.sphere(1, 24, 16);
const value = geometry.jointsBuffer;
console.log(value);
```

## See Also
- [Geometry.boundsCenter](./geometry-boundscenter.md)
- [Geometry.boundsMax](./geometry-boundsmax.md)
- [Geometry.boundsMin](./geometry-boundsmin.md)
- [Geometry.boundsRadius](./geometry-boundsradius.md)
- [Geometry.destroy](./geometry-destroy.md)
- [Geometry.indexBuffer](./geometry-indexbuffer.md)
- [Geometry.isIndexed](./geometry-isindexed.md)
- [Geometry.isSkinned](./geometry-isskinned.md)
- [Geometry.isSkinned8](./geometry-isskinned8.md)
- [Geometry.joints1Buffer](./geometry-joints1buffer.md)
- [Geometry.normalBuffer](./geometry-normalbuffer.md)
- [Geometry.positionBuffer](./geometry-positionbuffer.md)
