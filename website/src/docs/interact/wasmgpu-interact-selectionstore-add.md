# WasmGPU.createSelectionStore().add

## Summary
WasmGPU.createSelectionStore().add inserts one or more hits into the selection while preserving existing entries.
Existing entries with the same `(objectId, elementIndex)` key are overwritten in place.
Use this for additive selection behavior.

## Syntax
```ts
WasmGPU.createSelectionStore().add(hit: PickHit | PickHit[] | null | undefined): this
selection.add(hit);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `hit` | `PickHit \| PickHit[] \| null \| undefined` | Yes | One hit or array of hits to add; `null`/`undefined` is ignored. |

## Returns
`this` - Returns the same store for fluent chaining.

## Type Details
```ts
type PickHit = {
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
    attributes: {
        scalar?: number | null;
        vector?: [number, number, number, number] | null;
        packedPoint?: [number, number, number, number] | null;
        component?: "node" | "edge" | null;
        componentIndex?: number | null;
        color?: [number, number, number, number] | null;
        edgeEndpoints?: [number, number] | null;
        edgePositions?: [number, number, number, number, number, number] | null;
    } | null;
};
```

Nodelink node hits and edge hits remain distinct selection entries because the store key is built from `(objectId, elementIndex)`.

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
    selection.add(hit);
    console.log(selection.size);
});
```

## See Also
- [WasmGPU.createSelectionStore().replace](./wasmgpu-interact-selectionstore-replace.md)
- [WasmGPU.createSelectionStore().toggle](./wasmgpu-interact-selectionstore-toggle.md)
- [WasmGPU.createSelectionStore().apply](./wasmgpu-interact-selectionstore-apply.md)
