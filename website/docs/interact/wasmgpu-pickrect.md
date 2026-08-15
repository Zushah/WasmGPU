# WasmGPU.pickRect

## Summary
WasmGPU.pickRect performs rectangular region picking using two canvas-space corners.
It returns deduplicated element hits across the sampled pixels in that region.
Use it for box selection tools, brushing, and batched selection updates.

## Syntax
```ts
WasmGPU.pickRect(scene: Scene, camera: Camera, x0: number, y0: number, x1: number, y1: number, opts?: PickRegionQuery): Promise<PickRegionResult>
const result = await wgpu.pickRect(scene, camera, x0, y0, x1, y1, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `scene` | `Scene` | Yes | Scene to query for pickable mesh, point cloud, glyph field, nodelink, splatfield, and latticespace elements. |
| `camera` | `Camera` | Yes | Camera used for the region query projection. |
| `x0` | `number` | Yes | First corner X coordinate in CSS pixel space. |
| `y0` | `number` | Yes | First corner Y coordinate in CSS pixel space. |
| `x1` | `number` | Yes | Second corner X coordinate in CSS pixel space. |
| `y1` | `number` | Yes | Second corner Y coordinate in CSS pixel space. |
| `opts` | `PickRegionQuery` | No | Region behavior options, including hit cap and attribute payload inclusion. |

## Returns
`Promise<PickRegionResult>` - Resolves to a region selection result including hits, bounds, and truncation metadata.

## Type Details
```ts
type PickRegionQuery = {
    includeAttributes?: boolean; // default: true
    maxHits?: number; // default: 10000, clamped to >= 1
};

type PickRegionResult = {
    mode: "rect" | "lasso";
    hits: PickHit[];
    truncated: boolean; // true when maxHits limit was reached
    bounds: { x: number; y: number; width: number; height: number };
    sampledPixels: number; // number of framebuffer pixels scanned
};
```

Each hit uses the same `PickHit` contract as [WasmGPU.pick](./wasmgpu-pick.md). Lattice hits always decode the exact cell index into `ndIndex`; retained CPU records are needed only for optional cell-value attributes. Splat attributes likewise depend on retained records.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 500 });
const controls = wgpu.createControls.navigation(camera, canvas, { mode: "orbit", target: [0, 0, 0] });
const selection = wgpu.createSelectionStore();

let dragStart = null;
canvas.addEventListener("pointerdown", (e) => { dragStart = { x: e.offsetX, y: e.offsetY }; });
canvas.addEventListener("pointerup", async (e) => {
    if (!dragStart) return;
    const result = await wgpu.pickRect(scene, camera, dragStart.x, dragStart.y, e.offsetX, e.offsetY, { includeAttributes: false, maxHits: 5000 });
    selection.replace(result.hits);
    dragStart = null;
});

wgpu.run((dt) => {
    controls.update(dt);
    wgpu.render(scene, camera);
});
```

## See Also
- [WasmGPU.pick](./wasmgpu-pick.md)
- [WasmGPU.pickLasso](./wasmgpu-picklasso.md)
- [WasmGPU.createNodeLink](../objects/wasmgpu-createnodelink.md)
- [WasmGPU.createSelectionStore().replace](./wasmgpu-createselectionstore-replace.md)
- [WasmGPU.createSelectionStore().apply](./wasmgpu-createselectionstore-apply.md)
