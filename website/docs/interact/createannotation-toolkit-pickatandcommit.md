# createAnnotation.toolkit#pickAtAndCommit

## Summary
createAnnotation.toolkit#pickAtAndCommit runs a pick query and immediately feeds the result into selection/annotation commit logic.
Behavior depends on current mode (`marker`, `distance`, `angle`, `idle`) and staging state.
If no scene/camera is attached or the pick rejects, the call is processed as a miss. Concurrent calls are token-guarded; a stale completion returns `null` without changing selection or staging.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().pickAtAndCommit(x: number, y: number): Promise<AnnotationRecord | null>
const record = await toolkit.pickAtAndCommit(x, y);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | `number` | Yes | Canvas-space X coordinate in CSS pixels. |
| `y` | `number` | Yes | Canvas-space Y coordinate in CSS pixels. |

## Returns
`Promise<AnnotationRecord | null>` - Resolves to a created record when a mode transaction completes, otherwise `null`.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const toolkit = wgpu.createAnnotation.toolkit({ scene, camera, canvas, autoBindPointerEvents: false });

toolkit.setMode("distance");
canvas.addEventListener("click", async (event) => {
    const rect = canvas.getBoundingClientRect();
    const record = await toolkit.pickAtAndCommit(event.clientX - rect.left, event.clientY - rect.top);
    if (record) console.log("created", record.id, record.kind);
});
```

## See Also
- [createAnnotation.toolkit#ingestSelectionHit](./createannotation-toolkit-ingestselectionhit.md)
- [createAnnotation.toolkit#pickHoverAt](./createannotation-toolkit-pickhoverat.md)
- [createAnnotation.toolkit#setMode](./createannotation-toolkit-setmode.md)
