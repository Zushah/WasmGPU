# createCamera.orthographic#top

## Summary
createCamera.orthographic#top gets or sets the top frustum plane in world units. For undistorted view framing, update top and bottom together with the same scale convention as left/right. Projection is recomputed lazily after changes.

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
- [createCamera.orthographic#bottom](./createcamera-orthographic-bottom.md)
- [createCamera.orthographic#left](./createcamera-orthographic-left.md)
- [createCamera.orthographic#right](./createcamera-orthographic-right.md)
