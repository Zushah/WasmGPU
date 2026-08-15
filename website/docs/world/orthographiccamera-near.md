# OrthographicCamera.near

## Summary
OrthographicCamera.near gets or sets the near clipping plane distance. Even in orthographic projection, near/far ranges affect depth clipping and precision. Keep near as large as practical for stable depth behavior.

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

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.orthographic();
camera.near = 0.01;
console.log(camera.near);
```

## See Also
- [OrthographicCamera.far](./orthographiccamera-far.md)
- [OrthographicCamera.getProjectionMatrix](./orthographiccamera-getprojectionmatrix.md)
- [OrthographicCamera.updateFromCanvas](./orthographiccamera-updatefromcanvas.md)
