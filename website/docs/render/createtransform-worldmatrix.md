# createTransform#worldMatrix

## Summary
createTransform#worldMatrix returns the composed world-space 4x4 matrix.
It includes local TRS plus all ancestor transforms in parent order.
WasmGPU updates dirty transforms before returning, so the matrix reflects the latest hierarchy state.
Use this for world-space bounds, custom culling, and external renderer interop.
The returned JavaScript array is reused on later reads from this transform; mutate a copy, not the returned array.

## Syntax
```ts
WasmGPU.createTransform().worldMatrix: number[]
const world = transform.worldMatrix;
```

## Parameters
This API does not take parameters.

## Returns
`number[]` - World transform matrix as 16 numbers in column-major layout.

## Type Details
```ts
type Mat4 = [
    number, number, number, number,
    number, number, number, number,
    number, number, number, number,
    number, number, number, number
];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const parent = wgpu.createTransform().setPosition(5, 0, 0);
const child = wgpu.createTransform().setPosition(1, 0, 0).setParent(parent);

const world = child.worldMatrix;
console.log(world[12], world[13], world[14]);
```

## See Also
- [createTransform#localMatrix](./createtransform-localmatrix.md)
- [createTransform#worldPosition](./createtransform-worldposition.md)
- [createTransform#worldMatrixPtr](./createtransform-worldmatrixptr.md)
- [createTransform#setParent](./createtransform-setparent.md)
- [createTransform#traverse](./createtransform-traverse.md)
