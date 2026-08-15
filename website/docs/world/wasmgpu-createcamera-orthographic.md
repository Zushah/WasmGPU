# WasmGPU.createCamera.orthographic

## Summary
WasmGPU.createCamera.orthographic creates an `OrthographicCamera` with no perspective foreshortening. It is useful for measurement views, CAD-like interaction, and dense scientific plots where scale consistency matters. You can derive frustum extents directly from canvas size with `updateFromCanvas`.

## Syntax
```ts
WasmGPU.createCamera.orthographic(options?: OrthographicCameraOptions): OrthographicCamera
const camera = wgpu.createCamera.orthographic(options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `OrthographicCameraOptions` | No | Optional frustum and clip values; missing fields use defaults. |

## Returns
`OrthographicCamera` - Orthographic camera instance with `Camera` base behavior.

## Type Details
### OrthographicCameraOptions

```ts
type OrthographicCameraOptions = {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
    near?: number;
    far?: number;
};
```

#### OrthographicCameraOptions Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `left` | `number` | No | Left frustum boundary; default `-10`. |
| `right` | `number` | No | Right frustum boundary; default `10`. |
| `top` | `number` | No | Top frustum boundary; default `10`. |
| `bottom` | `number` | No | Bottom frustum boundary; default `-10`. |
| `near` | `number` | No | Near clipping plane distance; default `0.1`. |
| `far` | `number` | No | Far clipping plane distance; default `1000`. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.orthographic({ near: 0.01, far: 400 });
camera.updateFromCanvas(canvas.clientWidth, canvas.clientHeight, 70);
camera.transform.setPosition(0, 0, 140);
camera.lookAt(0, 0, 0);
```

## See Also
- [WasmGPU.createCamera.perspective](./wasmgpu-createcamera-perspective.md)
- [OrthographicCamera.updateFromCanvas](./orthographiccamera-updatefromcanvas.md)
- [OrthographicCamera.getProjectionMatrix](./orthographiccamera-getprojectionmatrix.md)
- [Camera.lookAt](./camera-lookat.md)
