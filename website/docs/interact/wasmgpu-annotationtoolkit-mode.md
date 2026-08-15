# WasmGPU.createAnnotation.toolkit().mode

## Summary
WasmGPU.createAnnotation.toolkit().mode returns the current interaction mode.
Modes control what happens when selection hits are committed (`marker`, `distance`, `angle`, or `idle`).

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().mode: AnnotationMode
const mode = toolkit.mode;
```

## Parameters
This accessor does not take parameters.

## Returns
`AnnotationMode` - Current mode string.

## Type Details
```ts
type AnnotationMode = "idle" | "marker" | "distance" | "angle";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const toolkit = wgpu.createAnnotation.toolkit({ canvas });
console.log(toolkit.mode);
```

## See Also
- [WasmGPU.createAnnotation.toolkit().setMode](./wasmgpu-annotationtoolkit-setmode.md)
- [WasmGPU.createAnnotation.toolkit().cancel](./wasmgpu-annotationtoolkit-cancel.md)
