# WasmGPU.createSelectionStore().has

## Summary
WasmGPU.createSelectionStore().has tests whether a specific `(objectId, elementIndex)` pair is selected.
Use it to drive conditional highlighting and toggling logic.

## Syntax
```ts
WasmGPU.createSelectionStore().has(objectId: number, elementIndex: number): boolean
const selected = selection.has(objectId, elementIndex);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `objectId` | `number` | Yes | Pick object identifier from `PickHit.objectId`. |
| `elementIndex` | `number` | Yes | Element index within that object from `PickHit.elementIndex`. |

## Returns
`boolean` - `true` when the entry exists, otherwise `false`.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 60, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const selection = wgpu.createSelectionStore();

const hit = await wgpu.pick(scene, camera, 120, 80);
selection.add(hit);
if (hit) {
    console.log(selection.has(hit.objectId, hit.elementIndex));
}
```

## See Also
- [WasmGPU.createSelectionStore().add](./wasmgpu-createselectionstore-add.md)
- [WasmGPU.createSelectionStore().remove](./wasmgpu-createselectionstore-remove.md)
- [WasmGPU.createSelectionStore().values](./wasmgpu-createselectionstore-values.md)
