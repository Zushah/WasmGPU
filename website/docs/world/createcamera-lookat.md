# createCamera#lookAt

## Summary
createCamera#lookAt rotates the camera so its forward axis points at a target position using a default up vector `[0, 1, 0]`. The target must have finite coordinates and differ from the camera position. This method updates orientation only; projection parameters are unchanged.

## Syntax
```ts
Camera.lookAt(x: number, y: number, z: number): Camera
Camera.lookAt(target: number[]): Camera
const result = camera.lookAt(target);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | `number` | Conditional | Finite target X coordinate when using the 3-number overload. |
| `y` | `number` | Conditional | Finite target Y coordinate when using the 3-number overload. |
| `z` | `number` | Conditional | Finite target Z coordinate when using the 3-number overload. |
| `target` | `number[]` | Conditional | Target position with at least three finite coordinates when using the vector overload. |

## Returns
`Camera` - The same camera instance for fluent chaining.

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
- [createCamera#lookAtWithUp](./createcamera-lookatwithup.md)
- [createCamera#position](./createcamera-position.md)
- [createCamera#up](./createcamera-up.md)
- [createCamera#viewMatrix](./createcamera-viewmatrix.md)
- [createCamera#setWorldPosition](./createcamera-setworldposition.md)
