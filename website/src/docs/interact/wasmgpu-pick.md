# WasmGPU.pick

## Summary
WasmGPU.pick performs a single-pixel picking query in canvas space and returns the nearest hit at that pixel.
Use it for click selection, hover probes, and annotation placement workflows.
The query runs asynchronously and resolves to `null` when nothing pickable is under the cursor.

## Syntax
```ts
WasmGPU.pick(scene: Scene, camera: Camera, x: number, y: number, opts?: PickQuery): Promise<PickResult | null>
const hit = await wgpu.pick(scene, camera, x, y, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `scene` | `Scene` | Yes | Scene to query against; only currently rendered pickable objects can be hit. |
| `camera` | `Camera` | Yes | Camera used to project the pick ray into the scene. |
| `x` | `number` | Yes | Canvas-space X coordinate in CSS pixels. |
| `y` | `number` | Yes | Canvas-space Y coordinate in CSS pixels. |
| `opts` | `PickQuery` | No | Optional flags, primarily whether hit attributes are included in the result payload. |

## Returns
`Promise<PickResult | null>` - Resolves to one hit record or `null` when no object is picked.

## Type Details
```ts
type PickQuery = {
    includeAttributes?: boolean; // default: true
};

type PickResult = PickHit;

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

Nodelink hits use the same `PickHit` envelope as meshes, point clouds, and glyph fields. When `includeAttributes` is true, `attributes.component` and `attributes.componentIndex` tell you whether the hit came from a node or an edge. Node hits can expose scalar/color data, and edge hits can expose scalar/color plus edge endpoints and endpoint positions when matching CPU-side nodelink records are still available. Node hits can also decode `ndIndex` from `ndShape`; edge hits return `ndIndex: null`.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene([0.02, 0.03, 0.05]);
const camera = wgpu.createCamera.perspective({ fov: 60, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const controls = wgpu.createControls.orbit(camera, canvas, { target: [0, 0, 0], zoomOnCursor: true });
const mesh = wgpu.createMesh(wgpu.geometry.sphere(0.75, 32, 16), wgpu.material.standard({ baseColor: [0.2, 0.6, 0.95, 1] }));
scene.add(mesh);

wgpu.run((dt) => {
    controls.update(dt);
    wgpu.render(scene, camera);
});

canvas.addEventListener("click", async (event) => {
    const rect = canvas.getBoundingClientRect();
    const hit = await wgpu.pick(scene, camera, event.clientX - rect.left, event.clientY - rect.top, { includeAttributes: true });
    console.log(hit ? { objectId: hit.objectId, index: hit.elementIndex, world: hit.worldPosition } : "no hit");
});
```

## See Also
- [WasmGPU.pickRect](./wasmgpu-pickrect.md)
- [WasmGPU.pickLasso](./wasmgpu-picklasso.md)
- [WasmGPU.createSelectionStore](./wasmgpu-createselectionstore.md)
- [WasmGPU.createNodeLink](../objects/wasmgpu-createnodelink.md)
- [WasmGPU.createAnnotation.toolkit](./wasmgpu-createannotation-toolkit.md)
