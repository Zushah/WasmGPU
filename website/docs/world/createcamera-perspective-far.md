# createCamera.perspective#far

## Summary
createCamera.perspective#far gets or sets the far clipping plane distance. Increasing far range enables distant content but can reduce depth resolution when near is very small. Tune near/far together for robust z-buffer behavior.

## Syntax
```ts
PerspectiveCamera.far: number
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

const camera = wgpu.createCamera.perspective({ aspect: canvas.clientWidth / canvas.clientHeight });
camera.near = 0.1;
camera.far = 5000;
console.log(camera.far);
```

## See Also
- [createCamera.perspective#near](./createcamera-perspective-near.md)
- [createCamera.perspective#fov](./createcamera-perspective-fov.md)
- [createCamera.perspective#getProjectionMatrix](./createcamera-perspective-getprojectionmatrix.md)
