# OrthographicCamera.top

## Summary
OrthographicCamera.top gets or sets the top frustum plane in world units. For undistorted view framing, update top and bottom together with the same scale convention as left/right. Projection is recomputed lazily after changes.

## Syntax
```ts
OrthographicCamera.top: number
camera.top = value;
const value = camera.top;
```

## Parameters
This property does not take call parameters; assign a numeric value to set it.

## Returns
`number` - Current top frustum boundary.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.orthographic();
camera.top = 40;
camera.bottom = -40;
console.log(camera.top);
```

## See Also
- [OrthographicCamera.bottom](./orthographiccamera-bottom.md)
- [OrthographicCamera.left](./orthographiccamera-left.md)
- [OrthographicCamera.right](./orthographiccamera-right.md)
