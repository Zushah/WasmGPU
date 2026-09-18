# createControls.navigation#dispose

## Summary
createControls.navigation#dispose detaches event listeners, clears callbacks, and ends any active transition.
It also releases fly-mode keyboard, pointer-lock, and document-level mouse listeners and exits pointer lock owned by the controls.
Call this before discarding controls to avoid leaked DOM listeners.

## Syntax
```ts
WasmGPU.createControls.navigation().dispose(): void
controls.dispose();
```

## Parameters
This API does not take parameters.

## Returns
`void` - No value is returned.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const camera = wgpu.createCamera.perspective({ fov: 50, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const controls = wgpu.createControls.navigation(camera, canvas);

window.addEventListener("beforeunload", () => {
    controls.dispose();
});
```

## See Also
- [createControls.navigation#onChange](./createcontrols-navigation-onchange.md)
- [createControls.navigation#onInteractionState](./createcontrols-navigation-oninteractionstate.md)
