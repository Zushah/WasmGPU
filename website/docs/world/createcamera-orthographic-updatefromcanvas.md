# createCamera.orthographic#updateFromCanvas

## Summary
createCamera.orthographic#updateFromCanvas derives left/right/top/bottom from viewport size and a zoom factor. This is a convenient resize path for orthographic apps that use pixel-like scaling behavior. It updates frustum bounds and returns the camera for chaining.
Width, height, and zoom must be finite and positive.

## Syntax
```ts
OrthographicCamera.updateFromCanvas(width: number, height: number, zoom?: number): OrthographicCamera
const result = camera.updateFromCanvas(width, height, zoom);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `width` | `number` | Yes | Finite positive viewport width used to compute horizontal half-extent. |
| `height` | `number` | Yes | Finite positive viewport height used to compute vertical half-extent. |
| `zoom` | `number` | No | Finite positive zoom multiplier where larger values shrink visible world extent; default `1`. |

## Returns
`OrthographicCamera` - The same camera instance after frustum update.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.orthographic({ near: 0.01, far: 4000 });
camera.updateFromCanvas(canvas.clientWidth, canvas.clientHeight, 80);
window.addEventListener("resize", () => {
    camera.updateFromCanvas(canvas.clientWidth, canvas.clientHeight, 80);
});
```

## See Also
- [createCamera.orthographic#left](./createcamera-orthographic-left.md)
- [createCamera.orthographic#right](./createcamera-orthographic-right.md)
- [createCamera.orthographic#top](./createcamera-orthographic-top.md)
- [createCamera.orthographic#bottom](./createcamera-orthographic-bottom.md)
- [createCamera.perspective#updateAspect](./createcamera-perspective-updateaspect.md)
