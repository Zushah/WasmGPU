# OrthographicCamera.getProjectionMatrix

## Summary
OrthographicCamera.getProjectionMatrix returns the current orthographic projection matrix. The matrix is recalculated lazily when frustum bounds or clip distances changed. Use this for custom projection math, culling, and GPU uniform setup.

## Syntax
```ts
OrthographicCamera.getProjectionMatrix(): number[]
const matrix = camera.getProjectionMatrix();
```

## Parameters
This method does not take parameters.

## Returns
`number[]` - 4x4 orthographic projection matrix in column-major array form.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.orthographic({ near: 0.1, far: 1000 });
camera.updateFromCanvas(canvas.clientWidth, canvas.clientHeight, 60);
const projection = camera.getProjectionMatrix();
console.log(projection.length, projection);
```

## See Also
- [OrthographicCamera.updateFromCanvas](./orthographiccamera-updatefromcanvas.md)
- [OrthographicCamera.near](./orthographiccamera-near.md)
- [OrthographicCamera.far](./orthographiccamera-far.md)
- [Camera.viewProjectionMatrix](./camera-viewprojectionmatrix.md)
