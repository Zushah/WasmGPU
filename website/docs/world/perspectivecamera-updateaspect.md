# PerspectiveCamera.updateAspect

## Summary
PerspectiveCamera.updateAspect updates aspect ratio directly from viewport width and height. Use it for manual resize handling after setting `autoAspect` to `false`. The method marks projection dirty and returns the same camera for chaining.

## Syntax
```ts
PerspectiveCamera.updateAspect(width: number, height: number): PerspectiveCamera
const result = camera.updateAspect(width, height);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `width` | `number` | Yes | Viewport width in pixels or CSS units used to compute aspect. |
| `height` | `number` | Yes | Viewport height in pixels or CSS units used to compute aspect. |

## Returns
`PerspectiveCamera` - The same camera instance after applying `width / height`.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

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
- [PerspectiveCamera.aspect](./perspectivecamera-aspect.md)
- [PerspectiveCamera.autoAspect](./perspectivecamera-autoaspect.md)
- [PerspectiveCamera.getProjectionMatrix](./perspectivecamera-getprojectionmatrix.md)
- [OrthographicCamera.updateFromCanvas](./orthographiccamera-updatefromcanvas.md)
