# createControls.navigation#onChange

## Summary
createControls.navigation#onChange registers a callback fired after every enabled `update()` call, even if there was no input delta. Immediate operations such as `setCamera()`, `reset()`, and non-animated view/fit changes also notify it.
The method returns an unsubscribe function for listener removal.

## Syntax
```ts
WasmGPU.createControls.navigation().onChange(listener: () => void): () => void
const unsubscribe = controls.onChange(listener);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `listener` | `() => void` | Yes | Callback invoked after control state changes are applied. |

## Returns
`() => void` - Unsubscribe function that removes the listener.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const camera = wgpu.createCamera.perspective({ fov: 50, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const controls = wgpu.createControls.navigation(camera, canvas);

const unsubscribe = controls.onChange(() => {
    console.log("camera moved", camera.position);
});
setTimeout(() => unsubscribe(), 5000);
```

## See Also
- [createControls.navigation#onInteractionState](./createcontrols-navigation-oninteractionstate.md)
- [createControls.navigation#update](./createcontrols-navigation-update.md)
