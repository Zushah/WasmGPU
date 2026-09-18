# createAnnotation.toolkit#onAnnotationsChange

## Summary
createAnnotation.toolkit#onAnnotationsChange registers a listener for annotation-store refreshes. The callback receives a cloned record snapshot and revision number. `setUnits()` also triggers this callback to rebuild labels even though record content and the revision are unchanged.

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
- [createAnnotation.toolkit#revision](./createannotation-toolkit-revision.md)
- [createAnnotation.toolkit#getAnnotations](./createannotation-toolkit-getannotations.md)
