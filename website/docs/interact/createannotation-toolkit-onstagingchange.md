# createAnnotation.toolkit#onStagingChange

## Summary
createAnnotation.toolkit#onStagingChange subscribes to staged-anchor updates during multi-step annotation creation.
This is useful for preview UIs in distance/angle modes.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().onStagingChange(listener: (mode: AnnotationMode, pending: readonly AnnotationAnchor[]) => void): () => void
const unsubscribe = toolkit.onStagingChange(listener);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `listener` | `(mode: AnnotationMode, pending: readonly AnnotationAnchor[]) => void` | Yes | Callback invoked whenever staged anchors are added/cleared. |

## Returns
`() => void` - Unsubscribe function.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const toolkit = wgpu.createAnnotation.toolkit({ canvas });

toolkit.onStagingChange((mode, pending) => {
    console.log(mode, pending.length);
});
toolkit.setMode("angle");
```

## See Also
- [createAnnotation.toolkit#pendingCount](./createannotation-toolkit-pendingcount.md)
- [createAnnotation.toolkit#setMode](./createannotation-toolkit-setmode.md)
