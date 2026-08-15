# WasmGPU.createAnnotation.toolkit().createDistance

## Summary
WasmGPU.createAnnotation.toolkit().createDistance creates a two-anchor distance annotation.
The record stores `distanceWorld` computed from anchor positions at creation and update time.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().createDistance(start: AnnotationAnchor, end: AnnotationAnchor, opts?: { label?: string | null; color?: [number, number, number, number]; visible?: boolean }): AnnotationRecord
const record = toolkit.createDistance(start, end, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `start` | `AnnotationAnchor` | Yes | First distance endpoint. |
| `end` | `AnnotationAnchor` | Yes | Second distance endpoint. |
| `opts` | `{ label?: string \| null; color?: [number, number, number, number]; visible?: boolean }` | No | Optional label/color/visibility overrides. |

## Returns
`AnnotationRecord` - Newly created distance annotation record.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const toolkit = wgpu.createAnnotation.toolkit({ scene, camera, canvas });

const distance = toolkit.createDistance(
    { position: [0, 0, 0], pick: null },
    { position: [0, 3, 4], pick: null },
    { label: "Span", color: [0.2, 0.8, 1.0, 1], visible: true }
);
console.log(distance.kind, distance.distanceWorld);
```

## See Also
- [WasmGPU.createAnnotation.toolkit().createMarker](./wasmgpu-annotationtoolkit-createmarker.md)
- [WasmGPU.createAnnotation.toolkit().createAngle](./wasmgpu-annotationtoolkit-createangle.md)
- [WasmGPU.createAnnotation.toolkit().setUnits](./wasmgpu-annotationtoolkit-setunits.md)
