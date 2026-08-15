# WasmGPU.createControls.navigation().setCamera

## Summary
WasmGPU.createControls.navigation().setCamera rebinds the controls instance to a different camera.
Active transitions are canceled, internal state is resynchronized, and change listeners are notified.
Use this when swapping projection types or replacing camera objects at runtime.

## Syntax
```ts
WasmGPU.createControls.navigation().setCamera(camera: Camera): this
controls.setCamera(camera);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `camera` | `Camera` | Yes | New camera object to control. |

## Returns
`this` - Returns the same controls instance.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const perspective = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 2000 });
const orthographic = wgpu.createCamera.orthographic({ left: -5, right: 5, top: 5, bottom: -5, near: 0.01, far: 2000 });
const controls = wgpu.createControls.navigation(perspective, canvas, { mode: "orbit", target: [0, 0, 0] });

document.getElementById("projection").addEventListener("click", () => {
    const next = controls.camera.type === "perspective" ? orthographic : perspective;
    controls.setCamera(next).syncFromCamera();
});
```

## See Also
- [WasmGPU.createControls.navigation().syncFromCamera](./wasmgpu-createcontrols-navigation-syncfromcamera.md)
- [WasmGPU.createControls.navigation().reset](./wasmgpu-createcontrols-navigation-reset.md)
