# createCamera.orthographic#left

## Summary
createCamera.orthographic#left gets or sets the left frustum plane. Together with right/top/bottom it defines world units visible in the orthographic view. Updating this value marks projection state dirty.

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
- [createCamera.orthographic#right](./createcamera-orthographic-right.md)
- [createCamera.orthographic#top](./createcamera-orthographic-top.md)
- [createCamera.orthographic#bottom](./createcamera-orthographic-bottom.md)
