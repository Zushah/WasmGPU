# createCamera.perspective#updateAspect

## Summary
createCamera.perspective#updateAspect updates aspect ratio directly from viewport width and height. Use it for manual resize handling after setting `autoAspect` to `false`. The method marks projection dirty and returns the same camera for chaining.
Both dimensions must be finite and positive so that `width / height` is a valid aspect ratio.

## Syntax
```ts
PerspectiveCamera.updateAspect(width: number, height: number): PerspectiveCamera
const result = camera.updateAspect(width, height);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `width` | `number` | Yes | Finite positive viewport width in pixels or CSS units. |
| `height` | `number` | Yes | Finite positive viewport height in the same units as `width`. |

## Returns
`PerspectiveCamera` - The same camera instance after applying `width / height`.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.perspective();
camera.updateAspect(canvas.clientWidth, canvas.clientHeight);
window.addEventListener("resize", () => {
    camera.updateAspect(canvas.clientWidth, canvas.clientHeight);
});
```

## See Also
- [createCamera.perspective#aspect](./createcamera-perspective-aspect.md)
- [createCamera.perspective#autoAspect](./createcamera-perspective-autoaspect.md)
- [createCamera.perspective#getProjectionMatrix](./createcamera-perspective-getprojectionmatrix.md)
- [createCamera.orthographic#updateFromCanvas](./createcamera-orthographic-updatefromcanvas.md)
