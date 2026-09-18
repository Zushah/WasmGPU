# createCamera.orthographic#far

## Summary
createCamera.orthographic#far gets or sets the far clipping plane distance. This value determines the back depth limit for visible geometry. Pair far with near based on expected scene depth span.

## Syntax
```ts
OrthographicCamera.far: number
camera.far = value;
const value = camera.far;
```

## Parameters
This property does not take call parameters; assign a numeric far distance to set it.

## Returns
`number` - Current far clipping distance.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.orthographic({ near: 0.01 });
camera.far = 2000;
console.log(camera.far);
```

## See Also
- [createCamera.orthographic#near](./createcamera-orthographic-near.md)
- [createCamera.orthographic#getProjectionMatrix](./createcamera-orthographic-getprojectionmatrix.md)
- [createCamera.orthographic#updateFromCanvas](./createcamera-orthographic-updatefromcanvas.md)
