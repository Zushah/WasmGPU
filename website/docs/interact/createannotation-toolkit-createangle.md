# createAnnotation.toolkit#createAngle

## Summary
createAnnotation.toolkit#createAngle creates a three-anchor angle annotation.
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

The angle is measured at `b` and clamped safely before `acos`. If either ray from `b` has effectively zero length, `angleRadians` is `0`.

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
- [createAnnotation.toolkit#createDistance](./createannotation-toolkit-createdistance.md)
- [createAnnotation.toolkit#setUnits](./createannotation-toolkit-setunits.md)
- [createAnnotation.toolkit#updateAnnotation](./createannotation-toolkit-updateannotation.md)
