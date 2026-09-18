# createCamera.orthographic#near

## Summary
createCamera.orthographic#near gets or sets the near clipping plane distance. Even in orthographic projection, near/far ranges affect depth clipping and precision. Keep near as large as practical for stable depth behavior.

## Syntax
```ts
OrthographicCamera.near: number
camera.near = value;
const value = camera.near;
```

## Parameters
This property does not take call parameters; assign a numeric near distance to set it.

## Returns
`number` - Current near clipping distance.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.orthographic();
camera.near = 0.01;
console.log(camera.near);
```

## See Also
- [createCamera.orthographic#far](./createcamera-orthographic-far.md)
- [createCamera.orthographic#getProjectionMatrix](./createcamera-orthographic-getprojectionmatrix.md)
- [createCamera.orthographic#updateFromCanvas](./createcamera-orthographic-updatefromcanvas.md)
