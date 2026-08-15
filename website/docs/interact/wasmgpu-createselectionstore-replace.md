# WasmGPU.createSelectionStore().replace

## Summary
WasmGPU.createSelectionStore().replace clears existing entries and then adds the provided hits.
Use it for primary click selection where prior state should be discarded.

## Syntax
```ts
WasmGPU.createSelectionStore().replace(hit: PickHit | PickHit[] | null | undefined): this
selection.replace(hit);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `hit` | `PickHit \| PickHit[] \| null \| undefined` | Yes | New selection payload; passing `null` or `undefined` clears selection. |

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
    selection.replace(hit);
    console.log(selection.values());
});
```

## See Also
- [WasmGPU.createSelectionStore().add](./wasmgpu-createselectionstore-add.md)
- [WasmGPU.createSelectionStore().clear](./wasmgpu-createselectionstore-clear.md)
- [WasmGPU.createSelectionStore().apply](./wasmgpu-createselectionstore-apply.md)
