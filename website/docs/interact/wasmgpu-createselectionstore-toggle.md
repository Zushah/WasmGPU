# WasmGPU.createSelectionStore().toggle

## Summary
WasmGPU.createSelectionStore().toggle flips membership for each provided hit.
Selected entries are removed; non-selected entries are added.
Use this for Ctrl/Cmd-click behavior.

## Syntax
```ts
WasmGPU.createSelectionStore().toggle(hit: PickHit | PickHit[] | null | undefined): this
selection.toggle(hit);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `hit` | `PickHit \| PickHit[] \| null \| undefined` | Yes | Hit or list of hits to toggle in selection state. |

## Returns
`this` - Returns the same store.

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
    selection.toggle(hit);
    console.log(selection.size);
});
```

## See Also
- [WasmGPU.createSelectionStore().add](./wasmgpu-createselectionstore-add.md)
- [WasmGPU.createSelectionStore().remove](./wasmgpu-createselectionstore-remove.md)
- [WasmGPU.createSelectionStore().has](./wasmgpu-createselectionstore-has.md)
