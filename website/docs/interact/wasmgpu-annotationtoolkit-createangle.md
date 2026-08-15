# WasmGPU.createAnnotation.toolkit().createAngle

## Summary
WasmGPU.createAnnotation.toolkit().createAngle creates a three-anchor angle annotation.
The middle anchor (`b`) is the vertex used to compute `angleRadians`.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().createAngle(a: AnnotationAnchor, b: AnnotationAnchor, c: AnnotationAnchor, opts?: { label?: string | null; color?: [number, number, number, number]; visible?: boolean }): AnnotationRecord
const record = toolkit.createAngle(a, b, c, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `a` | `AnnotationAnchor` | Yes | First ray endpoint anchor. |
| `b` | `AnnotationAnchor` | Yes | Angle vertex anchor. |
| `c` | `AnnotationAnchor` | Yes | Second ray endpoint anchor. |
| `opts` | `{ label?: string \| null; color?: [number, number, number, number]; visible?: boolean }` | No | Optional label/color/visibility settings. |

## Returns
`AnnotationRecord` - Newly created angle annotation record.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const toolkit = wgpu.createAnnotation.toolkit({ scene, camera, canvas });

const angle = toolkit.createAngle(
    { position: [1, 0, 0], pick: null },
    { position: [0, 0, 0], pick: null },
    { position: [0, 1, 0], pick: null },
    { label: "Corner", color: [1.0, 0.5, 0.2, 1], visible: true }
);
console.log(angle.kind, angle.angleRadians);
```

## See Also
- [WasmGPU.createAnnotation.toolkit().createDistance](./wasmgpu-annotationtoolkit-createdistance.md)
- [WasmGPU.createAnnotation.toolkit().setUnits](./wasmgpu-annotationtoolkit-setunits.md)
- [WasmGPU.createAnnotation.toolkit().updateAnnotation](./wasmgpu-annotationtoolkit-updateannotation.md)
