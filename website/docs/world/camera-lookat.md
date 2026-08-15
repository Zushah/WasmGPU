# Camera.lookAt

## Summary
Camera.lookAt rotates the camera so its forward axis points at a target position using a default up vector `[0, 1, 0]`. Use it after changing camera position or when recentering view on selected data. This method updates orientation only; projection parameters are unchanged.

## Syntax
```ts
Camera.lookAt(x: number, y: number, z: number): Camera
Camera.lookAt(target: number[]): Camera
const result = camera.lookAt(target);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | `number` | Conditional | Target X coordinate when using the 3-number overload. |
| `y` | `number` | Conditional | Target Y coordinate when using the 3-number overload. |
| `z` | `number` | Conditional | Target Z coordinate when using the 3-number overload. |
| `target` | `number[]` | Conditional | Target position array when using the vector overload. |

## Returns
`Camera` - The same camera instance for fluent chaining.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const camera = wgpu.createCamera.perspective({ aspect: canvas.clientWidth / canvas.clientHeight });
camera.transform.setPosition(4, 3, 6);
camera.lookAt([0, 0, 0]);

const scene = wgpu.createScene();
wgpu.render(scene, camera);
```

## See Also
- [Camera.lookAtWithUp](./camera-lookatwithup.md)
- [Camera.position](./camera-position.md)
- [Camera.up](./camera-up.md)
- [Camera.viewMatrix](./camera-viewmatrix.md)
