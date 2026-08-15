# WasmGPU.createControls.navigation().update

## Summary
In fly mode, `dtSeconds` drives keyboard translation and roll, while accumulated pointer input updates camera orientation. Orbit and trackball behavior remains target-centric.
WasmGPU.createControls.navigation().update advances interaction state, damping, zoom/pan deltas, and camera transitions.
Call this once per frame before rendering.
If controls are disabled, the method exits without mutating the camera.

## Syntax
```ts
WasmGPU.createControls.navigation().update(dtSeconds?: number): void
controls.update(dtSeconds);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `dtSeconds` | `number` | No | Elapsed seconds since last frame; defaults to `1/60` when omitted or non-positive. |

## Returns
`void` - No value is returned.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 60, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const controls = wgpu.createControls.navigation(camera, canvas, { enableDamping: true, dampingFactor: 0.12 });

wgpu.run((dt) => {
    controls.update(dt);
    wgpu.render(scene, camera);
});
```

## See Also
- [WasmGPU.createControls.navigation().onChange](./wasmgpu-createcontrols-navigation-onchange.md)
- [WasmGPU.createControls.navigation().hasActiveTransition](./wasmgpu-createcontrols-navigation-hasactivetransition.md)
- [WasmGPU.createControls.navigation().cancelTransition](./wasmgpu-createcontrols-navigation-canceltransition.md)
