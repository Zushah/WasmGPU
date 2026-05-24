# WasmGPU.createAnnotation.toolkit().selectionProbe

## Summary
WasmGPU.createAnnotation.toolkit().selectionProbe returns the latest selection readout snapshot.
It extends probe data with annotation linkage fields when a marker glyph instance is selected.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().selectionProbe: AnnotationSelectionReadout
const probe = toolkit.selectionProbe;
```

## Parameters
This accessor does not take parameters.

## Returns
`AnnotationSelectionReadout` - Latest selection probe payload.

## Type Details
```ts
type AnnotationSelectionReadout = {
    hit: boolean;
    kind: "mesh" | "pointcloud" | "glyphfield" | "nodelink" | null;
    objectId: number | null;
    elementIndex: number | null;
    worldPosition: [number, number, number] | null;
    ndIndex: number[] | null;
    attributes: PickAttributes | null;
    annotationId: string | null;
    annotationKind: "marker" | "distance" | "angle" | null;
    anchorRole: "marker" | "start" | "end" | "a" | "b" | "c" | null;
};
```

When the current selection comes from a `NodeLink`, `attributes.component` can distinguish node hits from edge hits if pick attributes were included.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const toolkit = wgpu.createAnnotation.toolkit({ scene, camera, canvas });

await toolkit.pickAtAndCommit(140, 90);
console.log(toolkit.selectionProbe);
```

## See Also
- [WasmGPU.createAnnotation.toolkit().pickAtAndCommit](./wasmgpu-interact-annotationtoolkit-pickatandcommit.md)
- [WasmGPU.createAnnotation.toolkit().removeSelectionAnnotation](./wasmgpu-interact-annotationtoolkit-removeselectionannotation.md)
- [WasmGPU.createAnnotation.toolkit().onSelectionReadout](./wasmgpu-interact-annotationtoolkit-onselectionreadout.md)
