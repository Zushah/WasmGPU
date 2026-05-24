# WasmGPU.createAnnotation.toolkit().hoverProbe

## Summary
WasmGPU.createAnnotation.toolkit().hoverProbe returns the latest hover readout snapshot.
The readout mirrors the most recent hover pick result or a no-hit state.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().hoverProbe: AnnotationProbeReadout
const probe = toolkit.hoverProbe;
```

## Parameters
This accessor does not take parameters.

## Returns
`AnnotationProbeReadout` - Latest hover probe payload.

## Type Details
```ts
type AnnotationProbeReadout = {
    hit: boolean;
    kind: "mesh" | "pointcloud" | "glyphfield" | "nodelink" | null;
    objectId: number | null;
    elementIndex: number | null;
    worldPosition: [number, number, number] | null;
    ndIndex: number[] | null;
    attributes: PickAttributes | null;
};
```

For `NodeLink` hits, `attributes.component` can tell you whether the hover target is a node or an edge when pick attributes are present.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const toolkit = wgpu.createAnnotation.toolkit({ scene, camera, canvas });

await toolkit.pickHoverAt(120, 80);
console.log(toolkit.hoverProbe);
```

## See Also
- [WasmGPU.createAnnotation.toolkit().pickHoverAt](./wasmgpu-interact-annotationtoolkit-pickhoverat.md)
- [WasmGPU.createAnnotation.toolkit().onHoverReadout](./wasmgpu-interact-annotationtoolkit-onhoverreadout.md)
