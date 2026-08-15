# WasmGPU.createAnnotation.toolkit().onModeChange

## Summary
WasmGPU.createAnnotation.toolkit().onModeChange registers a listener for mode transitions.
Use it to keep UI controls synchronized with toolkit state.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().onModeChange(listener: (mode: AnnotationMode) => void): () => void
const unsubscribe = toolkit.onModeChange(listener);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `listener` | `(mode: AnnotationMode) => void` | Yes | Callback invoked whenever mode changes. |

## Returns
`() => void` - Unsubscribe function.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const toolkit = wgpu.createAnnotation.toolkit({ canvas });

toolkit.onModeChange((mode) => {
    console.log("mode", mode);
});
toolkit.setMode("marker");
```

## See Also
- [WasmGPU.createAnnotation.toolkit().mode](./wasmgpu-annotationtoolkit-mode.md)
- [WasmGPU.createAnnotation.toolkit().setMode](./wasmgpu-annotationtoolkit-setmode.md)
- [WasmGPU.createAnnotation.toolkit().cancel](./wasmgpu-annotationtoolkit-cancel.md)
