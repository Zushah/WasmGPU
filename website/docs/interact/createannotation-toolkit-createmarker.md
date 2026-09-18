# createAnnotation.toolkit#createMarker

## Summary
createAnnotation.toolkit#createMarker creates a single-anchor marker annotation.
Marker annotations are useful for naming points of interest or attaching metadata labels.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().createMarker(anchor: AnnotationAnchor, opts?: { label?: string | null; color?: [number, number, number, number]; visible?: boolean }): AnnotationRecord
const record = toolkit.createMarker(anchor, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `anchor` | `AnnotationAnchor` | Yes | Marker anchor position and optional pick payload provenance. |
| `opts` | `{ label?: string \| null; color?: [number, number, number, number]; visible?: boolean }` | No | Optional display metadata for label, color, and visibility. |

## Returns
`AnnotationRecord` - Newly created marker record.

## Type Details
```ts
type AnnotationAnchor = {
    position: [number, number, number];
    pick: {
        kind: "mesh" | "pointcloud" | "glyphfield" | "nodelink" | "splatfield" | "latticespace";
        objectId: number;
        elementIndex: number;
        ndIndex: number[] | null;
        attributes: PickAttributes | null;
    } | null;
};
```

Markers preserve the pick kind, object and element IDs, multidimensional index, scalar/vector/packed-point data, nodelink component data, colors, and edge fields. Splat- and lattice-specific attribute arrays are not part of the retained marker-anchor contract.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const toolkit = wgpu.createAnnotation.toolkit({ scene, camera, canvas });

const marker = toolkit.createMarker(
    { position: [1.2, 0.5, -0.7], pick: null },
    { label: "Sensor A", color: [0.95, 0.75, 0.2, 1], visible: true }
);
console.log(marker.id, marker.kind);
```

## See Also
- [createAnnotation.toolkit#createDistance](./createannotation-toolkit-createdistance.md)
- [createAnnotation.toolkit#createAngle](./createannotation-toolkit-createangle.md)
- [createAnnotation.toolkit#updateAnnotation](./createannotation-toolkit-updateannotation.md)
