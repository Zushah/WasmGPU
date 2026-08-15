# OrthographicCamera.updateFromCanvas

## Summary
OrthographicCamera.updateFromCanvas derives left/right/top/bottom from viewport size and a zoom factor. This is a convenient resize path for orthographic apps that use pixel-like scaling behavior. It updates frustum bounds and returns the camera for chaining.

## Syntax
```ts
OrthographicCamera.updateFromCanvas(width: number, height: number, zoom?: number): OrthographicCamera
const result = camera.updateFromCanvas(width, height, zoom);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `width` | `number` | Yes | Viewport width used to compute horizontal half-extent. |
| `height` | `number` | Yes | Viewport height used to compute vertical half-extent. |
| `zoom` | `number` | No | Zoom multiplier where larger values shrink visible world extent; default `1`. |

## Returns
`OrthographicCamera` - The same camera instance after frustum update.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

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
- [OrthographicCamera.left](./orthographiccamera-left.md)
- [OrthographicCamera.right](./orthographiccamera-right.md)
- [OrthographicCamera.top](./orthographiccamera-top.md)
- [OrthographicCamera.bottom](./orthographiccamera-bottom.md)
- [PerspectiveCamera.updateAspect](./perspectivecamera-updateaspect.md)
