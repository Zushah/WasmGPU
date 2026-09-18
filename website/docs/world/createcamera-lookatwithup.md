# createCamera#lookAtWithUp

## Summary
createCamera#lookAtWithUp rotates the camera toward a target while honoring an explicit up direction. The target must contain finite coordinates and differ from the camera position; `up` must be a finite, nonzero usable direction but need not be normalized. The method substitutes a fallback up axis when the viewing direction and requested up are nearly collinear.

## Syntax
```ts
Camera.lookAtWithUp(target: readonly number[], up: readonly number[]): Camera
const result = camera.lookAtWithUp(target, up);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | `readonly number[]` | Yes | World-space point with at least three finite coordinates that differs from the camera position. |
| `up` | `readonly number[]` | Yes | Preferred finite, nonzero world-space up direction with at least three components; unit length is not required. |

## Returns
`Camera` - The same camera instance, allowing chained camera operations.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.perspective({ aspect: canvas.clientWidth / canvas.clientHeight });
camera.transform.setPosition(2, 2, 2);
camera.lookAtWithUp([0, 0, 0], [0, 0, 1]);

const scene = wgpu.createScene();
wgpu.render(scene, camera);
```

## See Also
- [createCamera#lookAt](./createcamera-lookat.md)
- [createCamera#up](./createcamera-up.md)
- [createCamera#viewMatrix](./createcamera-viewmatrix.md)
