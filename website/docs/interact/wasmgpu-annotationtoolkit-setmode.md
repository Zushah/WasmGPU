# WasmGPU.createAnnotation.toolkit().setMode

## Summary
WasmGPU.createAnnotation.toolkit().setMode changes annotation interaction mode.
Changing mode clears current staging anchors before applying the new mode.

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
- [WasmGPU.createAnnotation.toolkit().mode](./wasmgpu-annotationtoolkit-mode.md)
- [WasmGPU.createAnnotation.toolkit().cancel](./wasmgpu-annotationtoolkit-cancel.md)
- [WasmGPU.createAnnotation.toolkit().pendingCount](./wasmgpu-annotationtoolkit-pendingcount.md)
