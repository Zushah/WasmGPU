# PerspectiveCamera.aspect

## Summary
PerspectiveCamera.aspect gets or sets the width/height projection ratio used for perspective matrix generation. With the default `autoAspect: true`, rendering synchronizes it to the canvas; disable auto aspect before managing this value yourself.

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

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.perspective();
camera.aspect = canvas.clientWidth / canvas.clientHeight;
console.log(camera.aspect);
```

## See Also
- [PerspectiveCamera.updateAspect](./perspectivecamera-updateaspect.md)
- [PerspectiveCamera.autoAspect](./perspectivecamera-autoaspect.md)
- [PerspectiveCamera.fov](./perspectivecamera-fov.md)
- [PerspectiveCamera.getProjectionMatrix](./perspectivecamera-getprojectionmatrix.md)
