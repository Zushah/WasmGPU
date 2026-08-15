# WasmGPU.createAnnotation.toolkit().getAnnotations

## Summary
WasmGPU.createAnnotation.toolkit().getAnnotations returns a snapshot array of current annotation records.
Records include markers, distances, and angles with computed metrics and metadata.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().getAnnotations(): AnnotationRecord[]
const records = toolkit.getAnnotations();
```

## Parameters
This API does not take parameters.

## Returns
`AnnotationRecord[]` - Current annotation store values.

## Type Details
```ts
type AnnotationRecord =
    | AnnotationMarkerRecord
    | AnnotationDistanceRecord
    | AnnotationAngleRecord;
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const toolkit = wgpu.createAnnotation.toolkit({ scene, camera, canvas });

const annotations = toolkit.getAnnotations();
console.log(annotations.length);
```

## See Also
- [WasmGPU.createAnnotation.toolkit().createMarker](./wasmgpu-annotationtoolkit-createmarker.md)
- [WasmGPU.createAnnotation.toolkit().createDistance](./wasmgpu-annotationtoolkit-createdistance.md)
- [WasmGPU.createAnnotation.toolkit().createAngle](./wasmgpu-annotationtoolkit-createangle.md)
