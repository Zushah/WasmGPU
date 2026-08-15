# WasmGPU.createSelectionStore().remove

## Summary
WasmGPU.createSelectionStore().remove deletes one or more hits from the selection.
Entries that are not present are ignored, so this operation is safe for subtractive workflows.

## Syntax
```ts
WasmGPU.createSelectionStore().remove(hit: PickHit | PickHit[] | null | undefined): this
selection.remove(hit);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `hit` | `PickHit \| PickHit[] \| null \| undefined` | Yes | Hit or hit list to remove from selection. |

## Returns
`this` - Returns the same store for chaining.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 60, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const selection = wgpu.createSelectionStore();

const first = await wgpu.pick(scene, camera, 80, 80);
const second = await wgpu.pick(scene, camera, 180, 120);
selection.add([first, second]);
selection.remove(first);
console.log(selection.size);
```

## See Also
- [WasmGPU.createSelectionStore().add](./wasmgpu-createselectionstore-add.md)
- [WasmGPU.createSelectionStore().toggle](./wasmgpu-createselectionstore-toggle.md)
- [WasmGPU.createSelectionStore().apply](./wasmgpu-createselectionstore-apply.md)
