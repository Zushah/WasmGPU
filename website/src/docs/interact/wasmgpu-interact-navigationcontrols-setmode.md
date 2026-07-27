# WasmGPU.createControls.navigation().setMode

## Summary
WasmGPU.createControls.navigation().setMode switches interaction behavior among `orbit`, `trackball`, and `fly`.
The method synchronizes internal state from the current camera pose before and after the mode change.
Use it to expose runtime mode toggles in UI controls.

## Syntax
```ts
WasmGPU.createControls.navigation().setMode(mode: NavigationMode): this
controls.setMode(mode);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `mode` | `NavigationMode` | Yes | Requested controls mode: `"orbit"`, `"trackball"`, or `"fly"`. |

## Returns
`this` - Returns the same controls instance.

## Type Details
```ts
type NavigationMode = "orbit" | "trackball" | "fly";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const camera = wgpu.createCamera.perspective({ fov: 50, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const controls = wgpu.createControls.navigation(camera, canvas, { mode: "orbit" });

document.getElementById("mode").addEventListener("click", () => {
    controls.setMode(controls.mode === "orbit" ? "trackball" : "orbit");
});
```

## See Also
- [WasmGPU.createControls.navigation().mode](./wasmgpu-interact-navigationcontrols-mode.md)
- [WasmGPU.createControls.navigation().setView](./wasmgpu-interact-navigationcontrols-setview.md)
- [WasmGPU.createControls.orbit](./wasmgpu-createcontrols-orbit.md)
- [WasmGPU.createControls.trackball](./wasmgpu-createcontrols-trackball.md)
- [WasmGPU.createControls.fly](./wasmgpu-createcontrols-fly.md)
