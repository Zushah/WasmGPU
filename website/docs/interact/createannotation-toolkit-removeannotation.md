# createAnnotation.toolkit#removeAnnotation

## Summary
createAnnotation.toolkit#removeAnnotation deletes one annotation by record ID.
Returns whether a record was actually removed.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().removeAnnotation(id: string): boolean
const removed = toolkit.removeAnnotation(id);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `string` | Yes | Annotation ID to remove. |

## Returns
`boolean` - `true` if an annotation existed and was removed.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const toolkit = wgpu.createAnnotation.toolkit({ scene, camera, canvas });

const marker = toolkit.createMarker({ position: [0, 0, 0], pick: null });
console.log(toolkit.removeAnnotation(marker.id));
```

## See Also
- [createAnnotation.toolkit#removeSelectionAnnotation](./createannotation-toolkit-removeselectionannotation.md)
- [createAnnotation.toolkit#clearAnnotations](./createannotation-toolkit-clearannotations.md)
