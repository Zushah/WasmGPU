# WasmGPU.createAnnotation.toolkit().onSelectionReadout

## Summary
WasmGPU.createAnnotation.toolkit().onSelectionReadout subscribes to selection readout updates.
Selection readouts include annotation linkage metadata when annotation glyph instances are selected.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().onSelectionReadout(listener: (readout: AnnotationSelectionReadout) => void): () => void
const unsubscribe = toolkit.onSelectionReadout(listener);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `listener` | `(readout: AnnotationSelectionReadout) => void` | Yes | Callback invoked whenever selection readout changes. |

## Returns
`() => void` - Unsubscribe function.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const toolkit = wgpu.createAnnotation.toolkit({ scene, camera, canvas });

toolkit.onSelectionReadout((readout) => {
    console.log(readout.annotationId, readout.anchorRole);
});
```

## See Also
- [WasmGPU.createAnnotation.toolkit().selectionProbe](./wasmgpu-annotationtoolkit-selectionprobe.md)
- [WasmGPU.createAnnotation.toolkit().pickAtAndCommit](./wasmgpu-annotationtoolkit-pickatandcommit.md)
