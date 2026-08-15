# OrthographicCamera.bottom

## Summary
OrthographicCamera.bottom gets or sets the bottom frustum plane in world units. Use this with top/left/right to control framing and zoom behavior for orthographic scenes. Changing bottom marks projection dirty.

## Syntax
```ts
OrthographicCamera.bottom: number
camera.bottom = value;
const value = camera.bottom;
```

## Parameters
This property does not take call parameters; assign a numeric value to set it.

## Returns
`number` - Current bottom frustum boundary.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.orthographic();
camera.top = 30;
camera.bottom = -30;
console.log(camera.bottom);
```

## See Also
- [OrthographicCamera.top](./orthographiccamera-top.md)
- [OrthographicCamera.left](./orthographiccamera-left.md)
- [OrthographicCamera.right](./orthographiccamera-right.md)
