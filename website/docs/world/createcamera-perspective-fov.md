# createCamera.perspective#fov

## Summary
createCamera.perspective#fov gets or sets the vertical field of view in degrees. Larger values show more scene but increase perspective distortion near frame edges. Changing this property marks projection data dirty and affects subsequent renders.

## Syntax
```ts
PerspectiveCamera.fov: number
camera.fov = value;
const value = camera.fov;
```

## Parameters
This property does not take call parameters; assign a numeric degree value to set it.

## Returns
`number` - Current vertical FOV in degrees.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.perspective({ aspect: canvas.clientWidth / canvas.clientHeight });
camera.fov = 45;
console.log(camera.fov);
```

## See Also
- [createCamera.perspective#aspect](./createcamera-perspective-aspect.md)
- [createCamera.perspective#near](./createcamera-perspective-near.md)
- [createCamera.perspective#far](./createcamera-perspective-far.md)
- [createCamera.perspective#getProjectionMatrix](./createcamera-perspective-getprojectionmatrix.md)
