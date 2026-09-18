# createCamera#viewProjectionMatrix

## Summary
createCamera#viewProjectionMatrix returns a newly computed `projection * view` array for the current camera state. This matrix is commonly used for CPU-side culling, ray setup, and custom screen-space projections.

## Syntax
```ts
Camera.viewProjectionMatrix: number[]
const vp = camera.viewProjectionMatrix;
```

## Parameters
This property does not take parameters.

## Returns
`number[]` - Combined 4x4 view-projection matrix in column-major array form.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.perspective({
    fov: 60,
    aspect: canvas.clientWidth / canvas.clientHeight,
    near: 0.1,
    far: 1000
});
camera.transform.setPosition(3, 3, 3);
camera.lookAt(0, 0, 0);

const vp = camera.viewProjectionMatrix;
console.log(vp.length, vp);
```

## See Also
- [createCamera#viewMatrix](./createcamera-viewmatrix.md)
- [createCamera.perspective#getProjectionMatrix](./createcamera-perspective-getprojectionmatrix.md)
- [createCamera.orthographic#getProjectionMatrix](./createcamera-orthographic-getprojectionmatrix.md)
