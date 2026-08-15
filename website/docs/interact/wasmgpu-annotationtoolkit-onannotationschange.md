# WasmGPU.createAnnotation.toolkit().onAnnotationsChange

## Summary
WasmGPU.createAnnotation.toolkit().onAnnotationsChange registers a listener for annotation store content updates.
The callback receives the latest record snapshot and revision number.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().onAnnotationsChange(listener: (records: AnnotationRecord[], revision: number) => void): () => void
const unsubscribe = toolkit.onAnnotationsChange(listener);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `listener` | `(records: AnnotationRecord[], revision: number) => void` | Yes | Callback invoked whenever annotation records change. |

## Returns
`() => void` - Unsubscribe function.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const toolkit = wgpu.createAnnotation.toolkit({ canvas });

const off = toolkit.onAnnotationsChange((records, revision) => {
    console.log(revision, records.length);
});
setTimeout(() => off(), 5000);
```

## See Also
- [WasmGPU.createAnnotation.toolkit().revision](./wasmgpu-annotationtoolkit-revision.md)
- [WasmGPU.createAnnotation.toolkit().getAnnotations](./wasmgpu-annotationtoolkit-getannotations.md)
