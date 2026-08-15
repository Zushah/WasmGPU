# OrthographicCamera.far

## Summary
OrthographicCamera.far gets or sets the far clipping plane distance. This value determines the back depth limit for visible geometry. Pair far with near based on expected scene depth span.

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

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.orthographic({ near: 0.01 });
camera.far = 2000;
console.log(camera.far);
```

## See Also
- [OrthographicCamera.near](./orthographiccamera-near.md)
- [OrthographicCamera.getProjectionMatrix](./orthographiccamera-getprojectionmatrix.md)
- [OrthographicCamera.updateFromCanvas](./orthographiccamera-updatefromcanvas.md)
