# Camera.lookAtWithUp

## Summary
Camera.lookAtWithUp rotates the camera toward a target while honoring an explicit up direction. This is useful when working with non-default axis conventions or avoiding roll ambiguity in specialized views. The method includes a fallback when target and up become nearly collinear.

## Syntax
```ts
Camera.lookAtWithUp(target: readonly number[], up: readonly number[]): Camera
const result = camera.lookAtWithUp(target, up);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `target` | `readonly number[]` | Yes | World-space point the camera should face. |
| `up` | `readonly number[]` | Yes | Preferred world-space up vector for orientation construction. |

## Returns
`Camera` - The same camera instance, allowing chained camera operations.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

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
- [Camera.lookAt](./camera-lookat.md)
- [Camera.up](./camera-up.md)
- [Camera.viewMatrix](./camera-viewmatrix.md)
