# PerspectiveCamera.near

## Summary
PerspectiveCamera.near gets or sets the near clipping plane distance. Smaller near values let you inspect close geometry but can reduce depth precision at distance. Choose the largest near value compatible with your use case.

## Syntax
```ts
PerspectiveCamera.near: number
camera.near = value;
const value = camera.near;
```

## Parameters
This property does not take call parameters; assign a numeric near distance to set it.

## Returns
`number` - Current near clipping distance.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.perspective({ aspect: canvas.clientWidth / canvas.clientHeight });
camera.near = 0.05;
console.log(camera.near);
```

## See Also
- [PerspectiveCamera.far](./perspectivecamera-far.md)
- [PerspectiveCamera.fov](./perspectivecamera-fov.md)
- [PerspectiveCamera.getProjectionMatrix](./perspectivecamera-getprojectionmatrix.md)
