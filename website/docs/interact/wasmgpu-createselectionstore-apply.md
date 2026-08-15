# WasmGPU.createSelectionStore().apply

## Summary
WasmGPU.createSelectionStore().apply dispatches to `replace`, `add`, `toggle`, or `remove` based on the provided mode.
It provides a single entry point for interaction systems that map keyboard modifiers to selection semantics.

## Syntax
```ts
WasmGPU.createSelectionStore().apply(mode: SelectionMode, hit: PickHit | PickHit[] | null | undefined): this
selection.apply(mode, hit);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `mode` | `SelectionMode` | Yes | Operation to run: replace, additive, toggle, or subtractive selection. |
| `hit` | `PickHit \| PickHit[] \| null \| undefined` | Yes | Hit payload to apply under the requested mode. |

## Returns
`this` - Returns the same store instance.

## Type Details
```ts
type SelectionMode = "replace" | "add" | "toggle" | "remove";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 60, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const selection = wgpu.createSelectionStore();

canvas.addEventListener("click", async (event) => {
    const rect = canvas.getBoundingClientRect();
    const hit = await wgpu.pick(scene, camera, event.clientX - rect.left, event.clientY - rect.top);
    const mode = event.shiftKey ? "add" : event.ctrlKey ? "toggle" : event.altKey ? "remove" : "replace";
    selection.apply(mode, hit);
    console.log(mode, selection.size);
});
```

## See Also
- [WasmGPU.createSelectionStore().replace](./wasmgpu-createselectionstore-replace.md)
- [WasmGPU.createSelectionStore().add](./wasmgpu-createselectionstore-add.md)
- [WasmGPU.createSelectionStore().toggle](./wasmgpu-createselectionstore-toggle.md)
- [WasmGPU.createSelectionStore().remove](./wasmgpu-createselectionstore-remove.md)
