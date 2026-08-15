# WasmGPU.createControls.navigation().setTarget

## Summary
WasmGPU.createControls.navigation().setTarget sets the camera orbit/trackball focus point.
This changes the center used by rotate, pan, fit, and view operations.
Both vector and scalar overloads are supported.

## Syntax
```ts
WasmGPU.createControls.navigation().setTarget(x: number, y: number, z: number): this
WasmGPU.createControls.navigation().setTarget(target: Vec3): this
controls.setTarget(x, y, z);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | `number` | Yes (overload 1) | Target X coordinate. |
| `y` | `number` | Yes (overload 1) | Target Y coordinate. |
| `z` | `number` | Yes (overload 1) | Target Z coordinate. |
| `target` | `Vec3` | Yes (overload 2) | Full target vector `[x, y, z]`. |

## Returns
`this` - Returns the same controls instance.

## Type Details
```ts
type Vec3 = [number, number, number];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const camera = wgpu.createCamera.perspective({ fov: 60, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const controls = wgpu.createControls.navigation(camera, canvas, { mode: "orbit" });

controls.setTarget([2, 1, -3]);
controls.setTarget(0, 0, 0);
```

## See Also
- [WasmGPU.createControls.navigation().setView](./wasmgpu-createcontrols-navigation-setview.md)
- [WasmGPU.createControls.navigation().syncFromCamera](./wasmgpu-createcontrols-navigation-syncfromcamera.md)
- [WasmGPU.createControls.navigation().distance](./wasmgpu-createcontrols-navigation-distance.md)
