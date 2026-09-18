# createAnnotation.toolkit#ingestSelectionHit

## Summary
createAnnotation.toolkit#ingestSelectionHit applies a picked hit to current annotation mode logic.
In `marker` mode it creates one marker; in `distance` and `angle` modes it stages anchors until enough points are collected.
When complete, it returns the created annotation record.
In `idle` mode a miss clears staging; in an active creation mode, a miss updates the selection readout but leaves already staged anchors intact.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().ingestSelectionHit(hit: PickHit | null): AnnotationRecord | null
const record = toolkit.ingestSelectionHit(hit);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `hit` | `PickHit \| null` | Yes | Selection hit to commit; `null` clears or updates state depending on mode. |

## Returns
`AnnotationRecord | null` - Created record when mode staging completes; otherwise `null`.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const toolkit = wgpu.createAnnotation.toolkit({ scene, camera, canvas, autoBindPointerEvents: false });

toolkit.setMode("marker");
const hit = await wgpu.pick(scene, camera, 140, 100, { includeAttributes: true });
const created = toolkit.ingestSelectionHit(hit);
console.log(created?.id);
```

## See Also
- [createAnnotation.toolkit#pickAtAndCommit](./createannotation-toolkit-pickatandcommit.md)
- [createAnnotation.toolkit#setMode](./createannotation-toolkit-setmode.md)
- [createAnnotation.toolkit#pendingCount](./createannotation-toolkit-pendingcount.md)
