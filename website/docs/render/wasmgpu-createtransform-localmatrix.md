# WasmGPU.createTransform().localMatrix

## Summary
WasmGPU.createTransform().localMatrix returns the transform's composed local 4x4 matrix.
The matrix is derived from local position, quaternion rotation, and scale.
Before returning, WasmGPU updates pending dirty transforms so the matrix is current.
Use this for CPU-side math, debugging, or custom shader uniform upload paths.

## Syntax
```ts
WasmGPU.createTransform().localMatrix: number[]
const local = transform.localMatrix;
```

## Parameters
This API does not take parameters.

## Returns
`number[]` - Local transform matrix as 16 numbers in column-major layout.

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

const t = wgpu.createTransform();
t.setPosition(1, 2, 3).setRotationFromEuler(0, Math.PI / 4, 0).setScale(2, 2, 2);

const m = t.localMatrix;
console.log(m[12], m[13], m[14]);
```

## See Also
- [WasmGPU.createTransform().worldMatrix](./wasmgpu-createtransform-worldmatrix.md)
- [WasmGPU.createTransform().localMatrixPtr](./wasmgpu-createtransform-localmatrixptr.md)
- [WasmGPU.createTransform().setPosition](./wasmgpu-createtransform-setposition.md)
- [WasmGPU.createTransform().setRotation](./wasmgpu-createtransform-setrotation.md)
- [WasmGPU.createTransform().setScale](./wasmgpu-createtransform-setscale.md)
