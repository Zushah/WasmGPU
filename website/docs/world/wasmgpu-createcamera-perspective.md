# WasmGPU.createCamera.perspective

## Summary
WasmGPU.createCamera.perspective creates a `PerspectiveCamera` for standard 3D rendering with depth foreshortening. Set `fov`, `near`, and `far` explicitly for stable scientific views and predictable depth precision. Update aspect on resize to keep projection undistorted.

## Syntax
```ts
WasmGPU.createCamera.perspective(options?: PerspectiveCameraOptions): PerspectiveCamera
const camera = wgpu.createCamera.perspective(options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `PerspectiveCameraOptions` | No | Optional projection parameters; missing fields use defaults. |

## Returns
`PerspectiveCamera` - Perspective camera instance with `Camera` base methods/properties.

## Type Details
### PerspectiveCameraOptions

```ts
type PerspectiveCameraOptions = {
    fov?: number;
    aspect?: number;
    near?: number;
    far?: number;
};
```

#### PerspectiveCameraOptions Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `fov` | `number` | No | Vertical field of view in degrees; default `60`. |
| `aspect` | `number` | No | Width/height aspect ratio; default `16 / 9`. |
| `near` | `number` | No | Near clipping plane distance; default `0.1`. |
| `far` | `number` | No | Far clipping plane distance; default `1000`. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.perspective({
    fov: 55,
    aspect: canvas.clientWidth / canvas.clientHeight,
    near: 0.05,
    far: 2000
});
camera.transform.setPosition(3, 2, 6);
camera.lookAt(0, 0, 0);
```

## See Also
- [WasmGPU.createCamera.orthographic](./wasmgpu-createcamera-orthographic.md)
- [PerspectiveCamera.updateAspect](./perspectivecamera-updateaspect.md)
- [PerspectiveCamera.getProjectionMatrix](./perspectivecamera-getprojectionmatrix.md)
- [Camera.lookAt](./camera-lookat.md)
