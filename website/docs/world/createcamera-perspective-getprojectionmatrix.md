# createCamera.perspective#getProjectionMatrix

## Summary
createCamera.perspective#getProjectionMatrix returns the current perspective projection matrix from `fov`, `aspect`, `near`, and `far`. The returned array is reused across calls, so copy it before modifying it or retaining a snapshot.

## Syntax
```ts
PerspectiveCamera.getProjectionMatrix(): number[]
const matrix = camera.getProjectionMatrix();
```

## Parameters
This method does not take parameters.

## Returns
`number[]` - 4x4 perspective projection matrix in column-major array form.

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
- [createCamera.perspective#fov](./createcamera-perspective-fov.md)
- [createCamera.perspective#aspect](./createcamera-perspective-aspect.md)
- [createCamera.perspective#near](./createcamera-perspective-near.md)
- [createCamera.perspective#far](./createcamera-perspective-far.md)
- [createCamera#viewProjectionMatrix](./createcamera-viewprojectionmatrix.md)
