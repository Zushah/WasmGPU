# createCamera.orthographic#bottom

## Summary
createCamera.orthographic#bottom gets or sets the bottom frustum plane in world units. Use this with top/left/right to control framing and zoom behavior for orthographic scenes. Changing bottom marks projection dirty.

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
- [createCamera.orthographic#top](./createcamera-orthographic-top.md)
- [createCamera.orthographic#left](./createcamera-orthographic-left.md)
- [createCamera.orthographic#right](./createcamera-orthographic-right.md)
