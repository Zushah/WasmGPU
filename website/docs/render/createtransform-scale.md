# createTransform#scale

## Summary
createTransform#scale returns the local non-uniform scale vector.
Scale is applied in local space before parent transforms are composed into world transforms.
Use this for object sizing, axis stretching, or animation blending of local dimensions.
Update scale via `setScale` or `setUniformScale` for proper dirty propagation.
Treat the returned array as read-only. Direct element assignment does not update the backing transform-store scale.

## Syntax
```ts
WasmGPU.createTransform().scale: number[]
const scale = transform.scale;
```

## Parameters
This API does not take parameters.

## Returns
`number[]` - Local scale as `[sx, sy, sz]`.

## Type Details
```ts
type LocalScale = [number, number, number];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const model = wgpu.createTransform().setScale(2.0, 1.0, 0.5);
const [sx, sy, sz] = model.scale;
console.log(sx, sy, sz);
```

## See Also
- [createTransform#setScale](./createtransform-setscale.md)
- [createTransform#setUniformScale](./createtransform-setuniformscale.md)
- [createTransform#scalePtr](./createtransform-scaleptr.md)
- [createTransform#localMatrix](./createtransform-localmatrix.md)
- [createTransform#worldMatrix](./createtransform-worldmatrix.md)
