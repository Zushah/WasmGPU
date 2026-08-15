# OrthographicCamera.right

## Summary
OrthographicCamera.right gets or sets the right frustum plane. It should usually be paired with `left` to maintain symmetric or intentionally asymmetric extents. Changing this value invalidates cached projection data.

## Syntax
```ts
OrthographicCamera.right: number
camera.right = value;
const value = camera.right;
```

## Parameters
This property does not take call parameters; assign a numeric value to set it.

## Returns
`number` - Current right frustum boundary.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.orthographic();
camera.left = -80;
camera.right = 80;
console.log(camera.right);
```

## See Also
- [OrthographicCamera.left](./orthographiccamera-left.md)
- [OrthographicCamera.top](./orthographiccamera-top.md)
- [OrthographicCamera.bottom](./orthographiccamera-bottom.md)
