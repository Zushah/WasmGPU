# createCamera.orthographic#getProjectionMatrix

## Summary
createCamera.orthographic#getProjectionMatrix returns the current orthographic projection matrix. The returned array is reused across calls, so copy it before modifying it or retaining a snapshot.

## Syntax
```ts
OrthographicCamera.getProjectionMatrix(): number[]
const matrix = camera.getProjectionMatrix();
```

## Parameters
This method does not take parameters.

## Returns
`number[]` - 4x4 orthographic projection matrix in column-major array form.

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
- [createCamera.orthographic#updateFromCanvas](./createcamera-orthographic-updatefromcanvas.md)
- [createCamera.orthographic#near](./createcamera-orthographic-near.md)
- [createCamera.orthographic#far](./createcamera-orthographic-far.md)
- [createCamera#viewProjectionMatrix](./createcamera-viewprojectionmatrix.md)
