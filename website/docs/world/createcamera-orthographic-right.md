# createCamera.orthographic#right

## Summary
createCamera.orthographic#right gets or sets the right frustum plane. It should usually be paired with `left` to maintain symmetric or intentionally asymmetric extents. Changes affect the next projection-matrix access.

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
- [createCamera.orthographic#left](./createcamera-orthographic-left.md)
- [createCamera.orthographic#top](./createcamera-orthographic-top.md)
- [createCamera.orthographic#bottom](./createcamera-orthographic-bottom.md)
