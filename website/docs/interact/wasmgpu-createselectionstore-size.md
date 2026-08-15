# WasmGPU.createSelectionStore().size

## Summary
WasmGPU.createSelectionStore().size returns the number of unique selected entries.
Uniqueness is determined by `(objectId, elementIndex)`, so repeated adds of the same element do not increase this value.

## Syntax
```ts
WasmGPU.createSelectionStore().size: number
const count = selection.size;
```

## Parameters
This API does not take parameters.

## Returns
`number` - Current number of stored selection entries.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 60, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const selection = wgpu.createSelectionStore();

const region = await wgpu.pickRect(scene, camera, 30, 30, 200, 160, { maxHits: 2000 });
selection.add(region.hits);
console.log(selection.size);
```

## See Also
- [WasmGPU.createSelectionStore](./wasmgpu-createselectionstore.md)
- [WasmGPU.createSelectionStore().add](./wasmgpu-createselectionstore-add.md)
- [WasmGPU.createSelectionStore().values](./wasmgpu-createselectionstore-values.md)
