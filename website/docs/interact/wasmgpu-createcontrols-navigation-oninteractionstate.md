# WasmGPU.createControls.navigation().onInteractionState

## Summary
WasmGPU.createControls.navigation().onInteractionState registers a callback for interaction start/end state.
The listener receives `true` when user interaction becomes active and `false` when it ends.

## Syntax
```ts
WasmGPU.createControls.navigation().onInteractionState(listener: (active: boolean) => void): () => void
const unsubscribe = controls.onInteractionState(listener);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `listener` | `(active: boolean) => void` | Yes | Callback that tracks whether pointer/wheel interaction is currently active. |

## Returns
`() => void` - Unsubscribe function.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const camera = wgpu.createCamera.perspective({ fov: 50, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const controls = wgpu.createControls.navigation(camera, canvas);

controls.onInteractionState((active) => {
    canvas.style.cursor = active ? "grabbing" : "grab";
});
```

## See Also
- [WasmGPU.createControls.navigation().onChange](./wasmgpu-createcontrols-navigation-onchange.md)
- [WasmGPU.createControls.navigation().dispose](./wasmgpu-createcontrols-navigation-dispose.md)
