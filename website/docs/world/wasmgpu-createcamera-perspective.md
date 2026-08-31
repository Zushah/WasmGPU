# WasmGPU.createCamera.perspective

## Summary
WasmGPU.createCamera.perspective creates a `PerspectiveCamera` for standard 3D rendering with depth foreshortening. By default, rendering keeps its aspect ratio synchronized with the canvas; set `autoAspect: false` to preserve an explicit aspect.

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
type PerspectiveCameraDescriptor = {
    fov?: number;
    aspect?: number;
    autoAspect?: boolean;
    near?: number;
    far?: number;
};
```

#### PerspectiveCameraOptions Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `fov` | `number` | No | Vertical field of view in degrees; default `60`. |
| `aspect` | `number` | No | Width/height aspect ratio; default `16 / 9`. |
| `autoAspect` | `boolean` | No | Whether rendering synchronizes `aspect` to the canvas; default `true`. |
| `near` | `number` | No | Near clipping plane distance; default `0.1`. |
| `far` | `number` | No | Far clipping plane distance; default `1000`. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.perspective({
    fov: 55,
    aspect: canvas.clientWidth / canvas.clientHeight,
    autoAspect: false,
    near: 0.05,
    far: 2000
});
camera.transform.setPosition(3, 2, 6);
camera.lookAt(0, 0, 0);
```

## See Also
- [WasmGPU.createCamera.orthographic](./wasmgpu-createcamera-orthographic.md)
- [PerspectiveCamera.updateAspect](./perspectivecamera-updateaspect.md)
- [PerspectiveCamera.autoAspect](./perspectivecamera-autoaspect.md)
- [PerspectiveCamera.getProjectionMatrix](./perspectivecamera-getprojectionmatrix.md)
- [Camera.lookAt](./camera-lookat.md)
