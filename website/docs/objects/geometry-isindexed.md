# Geometry.isIndexed

## Summary
Geometry.isIndexed reads the current `isIndexed` value from this Geometry instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
Geometry.isIndexed: boolean
const value = geometry.isIndexed;
```

## Parameters
This API does not take parameters.

## Returns
`boolean` - Boolean result indicating whether the queried condition is satisfied.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const geometry = wgpu.geometry.sphere(1, 24, 16);
const value = geometry.isIndexed;
console.log(value);
```

## See Also
- [Geometry.boundsCenter](./geometry-boundscenter.md)
- [Geometry.boundsMax](./geometry-boundsmax.md)
- [Geometry.boundsMin](./geometry-boundsmin.md)
- [Geometry.boundsRadius](./geometry-boundsradius.md)
- [Geometry.destroy](./geometry-destroy.md)
- [Geometry.indexBuffer](./geometry-indexbuffer.md)
- [Geometry.isSkinned](./geometry-isskinned.md)
- [Geometry.isSkinned8](./geometry-isskinned8.md)
- [Geometry.joints1Buffer](./geometry-joints1buffer.md)
- [Geometry.jointsBuffer](./geometry-jointsbuffer.md)
- [Geometry.normalBuffer](./geometry-normalbuffer.md)
- [Geometry.positionBuffer](./geometry-positionbuffer.md)
