# WasmGPU.createSelectionStore().values

## Summary
WasmGPU.createSelectionStore().values returns a snapshot array of current selection entries.
Each entry includes hit metadata plus a stable key string (`objectId:elementIndex`).

## Syntax
```ts
WasmGPU.createSelectionStore().values(): SelectionEntry[]
const entries = selection.values();
```

## Parameters
This API does not take parameters.

## Returns
`SelectionEntry[]` - Array copy of all selected entries at call time.

## Type Details
```ts
type SelectionEntry = {
    key: string; // "<objectId>:<elementIndex>"
    kind:
        | "mesh"
        | "pointcloud"
        | "glyphfield"
        | "nodelink";
    object:
        | Mesh
        | PointCloud
        | GlyphField
        | NodeLink;
    objectId: number;
    elementIndex: number;
    worldPosition: [number, number, number];
    ndIndex: number[] | null;
    attributes: PickAttributes | null;
};
```

For nodelinks, entries preserve the original node-or-edge element identity through `elementIndex`, and `attributes.component` can tell you which side of the graph the hit came from when attributes were included.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 60, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const selection = wgpu.createSelectionStore();

const region = await wgpu.pickRect(scene, camera, 40, 40, 220, 180, { maxHits: 1000 });
selection.replace(region.hits);
for (const entry of selection.values()) {
    console.log(entry.key, entry.kind, entry.worldPosition);
}
```

## See Also
- [WasmGPU.createSelectionStore().size](./wasmgpu-interact-selectionstore-size.md)
- [WasmGPU.createSelectionStore().has](./wasmgpu-interact-selectionstore-has.md)
- [WasmGPU.createSelectionStore().clear](./wasmgpu-interact-selectionstore-clear.md)
