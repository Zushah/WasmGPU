# createAnnotation.toolkit#onModeChange

## Summary
createAnnotation.toolkit#onModeChange registers a listener for mode transitions. `setMode()` does not notify when given the current mode; `cancel()` always notifies with `"idle"`, even if the toolkit was already idle.
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
- [createAnnotation.toolkit#mode](./createannotation-toolkit-mode.md)
- [createAnnotation.toolkit#setMode](./createannotation-toolkit-setmode.md)
- [createAnnotation.toolkit#cancel](./createannotation-toolkit-cancel.md)
