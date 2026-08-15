# WasmGPU.pickLasso

## Summary
WasmGPU.pickLasso performs polygon-region picking using a lasso path in canvas space.
The lasso is rasterized to a bounded query region, then sampled against the pick buffers.
Use it for free-form selection where a rectangle is too coarse.

## Syntax
```ts
WasmGPU.pickLasso(scene: Scene, camera: Camera, points: PickLassoPoint[], opts?: PickRegionQuery): Promise<PickRegionResult>
const result = await wgpu.pickLasso(scene, camera, points, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `scene` | `Scene` | Yes | Scene to query for pickable mesh, point cloud, glyph field, nodelink, splatfield, and latticespace elements. |
| `camera` | `Camera` | Yes | Camera used to project the lasso query. |
| `points` | `PickLassoPoint[]` | Yes | Ordered polygon points in canvas CSS pixels; at least 3 points are needed for non-empty selection. |
| `opts` | `PickRegionQuery` | No | Optional limits and payload flags for lasso queries. |

## Returns
`Promise<PickRegionResult>` - Resolves to lasso mode metadata and the selected hit set.

## Type Details
```ts
type PickLassoPoint = {
    x: number;
    y: number;
};

type PickRegionQuery = {
    includeAttributes?: boolean; // default: true
    maxHits?: number; // default: 10000
};

type PickRegionResult = {
    mode: "rect" | "lasso";
    hits: PickHit[];
    truncated: boolean;
    bounds: { x: number; y: number; width: number; height: number };
    sampledPixels: number;
};
```

Each hit uses the same `PickHit` contract as [WasmGPU.pick](./wasmgpu-pick.md). Lattice hits always decode the exact cell index into `ndIndex`; retained CPU records are needed only for optional cell-value attributes. Splat attributes likewise depend on retained records.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 50, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const controls = wgpu.createControls.trackball(camera, canvas, { target: [0, 0, 0], enableDamping: true });

const lassoPoints = [
    { x: 40, y: 80 }, { x: 150, y: 40 }, { x: 280, y: 100 },
    { x: 260, y: 220 }, { x: 110, y: 240 }
];
const lassoResult = await wgpu.pickLasso(scene, camera, lassoPoints, { includeAttributes: true, maxHits: 3000 });
console.log(lassoResult.mode, lassoResult.hits.length, lassoResult.truncated);

wgpu.run((dt) => {
    controls.update(dt);
    wgpu.render(scene, camera);
});
```

## See Also
- [WasmGPU.pick](./wasmgpu-pick.md)
- [WasmGPU.pickRect](./wasmgpu-pickrect.md)
- [WasmGPU.createNodeLink](../objects/wasmgpu-createnodelink.md)
- [WasmGPU.createSelectionStore().toggle](./wasmgpu-createselectionstore-toggle.md)
- [WasmGPU.createAnnotation.toolkit().ingestSelectionHit](./wasmgpu-annotationtoolkit-ingestselectionhit.md)
