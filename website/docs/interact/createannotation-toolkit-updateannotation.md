# createAnnotation.toolkit#updateAnnotation

## Summary
createAnnotation.toolkit#updateAnnotation patches an existing annotation by ID.
The toolkit routes the patch to marker/distance/angle-specific update logic based on record kind.
Returns `null` when no annotation exists for the given ID.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().updateAnnotation(id: string, patch: any): AnnotationRecord | null
const updated = toolkit.updateAnnotation(id, patch);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Annotation record identifier. |
| `patch` | `any` | Yes | Partial label/color/visibility and anchor fields appropriate to the existing record kind. The current public signature does not statically discriminate the patch type. |

## Returns
`AnnotationRecord | null` - Updated record snapshot or `null` if the ID was not found.

Distance and angle metrics are recomputed after every successful update. Fields that do not apply to the existing record kind are ignored; even an empty patch advances its update timestamp and store revision.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const toolkit = wgpu.createAnnotation.toolkit({ scene, camera, canvas });

const marker = toolkit.createMarker({ position: [1, 2, 3], pick: null }, { label: "Initial" });
const updated = toolkit.updateAnnotation(marker.id, { label: "Updated", color: [0.1, 0.9, 0.4, 1] });
console.log(updated?.label);
```

## See Also
- [createAnnotation.toolkit#removeAnnotation](./createannotation-toolkit-removeannotation.md)
- [createAnnotation.toolkit#getAnnotations](./createannotation-toolkit-getannotations.md)
