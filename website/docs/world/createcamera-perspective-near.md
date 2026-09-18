# createCamera.perspective#near

## Summary
createCamera.perspective#near gets or sets the near clipping plane distance. Smaller near values let you inspect close geometry but can reduce depth precision at distance. Choose the largest near value compatible with your use case.

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

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.perspective({ aspect: canvas.clientWidth / canvas.clientHeight });
camera.near = 0.05;
console.log(camera.near);
```

## See Also
- [createCamera.perspective#far](./createcamera-perspective-far.md)
- [createCamera.perspective#fov](./createcamera-perspective-fov.md)
- [createCamera.perspective#getProjectionMatrix](./createcamera-perspective-getprojectionmatrix.md)
