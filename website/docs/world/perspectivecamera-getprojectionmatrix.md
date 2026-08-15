# PerspectiveCamera.getProjectionMatrix

## Summary
PerspectiveCamera.getProjectionMatrix returns the current perspective projection matrix and lazily recomputes it when parameters changed. The matrix uses the camera's `fov`, `aspect`, `near`, and `far`. Use this when you need explicit projection data for custom math or GPU bindings.

## Syntax
```ts
PerspectiveCamera.getProjectionMatrix(): number[]
const matrix = camera.getProjectionMatrix();
```

## Parameters
This method does not take parameters.

## Returns
`number[]` - 4x4 perspective projection matrix in column-major array form.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.perspective({
    fov: 50,
    aspect: canvas.clientWidth / canvas.clientHeight,
    near: 0.1,
    far: 1500
});
const projection = camera.getProjectionMatrix();
console.log(projection.length, projection);
```

## See Also
- [PerspectiveCamera.fov](./perspectivecamera-fov.md)
- [PerspectiveCamera.aspect](./perspectivecamera-aspect.md)
- [PerspectiveCamera.near](./perspectivecamera-near.md)
- [PerspectiveCamera.far](./perspectivecamera-far.md)
- [Camera.viewProjectionMatrix](./camera-viewprojectionmatrix.md)
