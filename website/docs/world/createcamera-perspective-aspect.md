# createCamera.perspective#aspect

## Summary
createCamera.perspective#aspect gets or sets the width/height projection ratio used for perspective matrix generation. With the default `autoAspect: true`, rendering synchronizes it to the canvas; disable auto aspect before managing this value yourself.

## Syntax
```ts
PerspectiveCamera.aspect: number
camera.aspect = value;
const value = camera.aspect;
```

## Parameters
This property does not take call parameters; assign a numeric aspect ratio to set it.

## Returns
`number` - Current perspective aspect ratio.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.perspective();
camera.aspect = canvas.clientWidth / canvas.clientHeight;
console.log(camera.aspect);
```

## See Also
- [createCamera.perspective#updateAspect](./createcamera-perspective-updateaspect.md)
- [createCamera.perspective#autoAspect](./createcamera-perspective-autoaspect.md)
- [createCamera.perspective#fov](./createcamera-perspective-fov.md)
- [createCamera.perspective#getProjectionMatrix](./createcamera-perspective-getprojectionmatrix.md)
