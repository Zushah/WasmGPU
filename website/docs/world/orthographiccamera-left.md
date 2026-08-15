# OrthographicCamera.left

## Summary
OrthographicCamera.left gets or sets the left frustum plane. Together with right/top/bottom it defines world units visible in the orthographic view. Updating this value marks projection state dirty.

## Syntax
```ts
OrthographicCamera.left: number
camera.left = value;
const value = camera.left;
```

## Parameters
This property does not take call parameters; assign a numeric value to set it.

## Returns
`number` - Current left frustum boundary.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.orthographic();
camera.left = -50;
camera.right = 50;
console.log(camera.left);
```

## See Also
- [OrthographicCamera.right](./orthographiccamera-right.md)
- [OrthographicCamera.top](./orthographiccamera-top.md)
- [OrthographicCamera.bottom](./orthographiccamera-bottom.md)
