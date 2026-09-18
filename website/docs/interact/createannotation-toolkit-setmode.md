# createAnnotation.toolkit#setMode

## Summary
createAnnotation.toolkit#setMode changes annotation interaction mode. A real mode change clears staged anchors and staging listeners observe the new mode with an empty pending list. Setting the current mode again is a no-op and does not clear staging.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().setMode(mode: AnnotationMode): this
toolkit.setMode(mode);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `mode` | `AnnotationMode` | Yes | Target interaction mode: idle, marker, distance, or angle. |

## Returns
`this` - Returns the same toolkit.

## Type Details
```ts
type AnnotationMode = "idle" | "marker" | "distance" | "angle";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const toolkit = wgpu.createAnnotation.toolkit({ canvas });

toolkit.setMode("distance");
```

## See Also
- [createAnnotation.toolkit#mode](./createannotation-toolkit-mode.md)
- [createAnnotation.toolkit#cancel](./createannotation-toolkit-cancel.md)
- [createAnnotation.toolkit#pendingCount](./createannotation-toolkit-pendingcount.md)
