# WasmGPU.createAnnotation.toolkit().onHoverReadout

## Summary
WasmGPU.createAnnotation.toolkit().onHoverReadout subscribes to hover probe updates.
The callback receives the same payload exposed by `hoverProbe`.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().onHoverReadout(listener: (readout: AnnotationProbeReadout) => void): () => void
const unsubscribe = toolkit.onHoverReadout(listener);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `listener` | `(readout: AnnotationProbeReadout) => void` | Yes | Callback invoked whenever hover readout changes. |

## Returns
`() => void` - Unsubscribe function.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const toolkit = wgpu.createAnnotation.toolkit({ scene, camera, canvas });

toolkit.onHoverReadout((readout) => {
    console.log(readout.hit ? readout.worldPosition : null);
});
```

## See Also
- [WasmGPU.createAnnotation.toolkit().hoverProbe](./wasmgpu-annotationtoolkit-hoverprobe.md)
- [WasmGPU.createAnnotation.toolkit().pickHoverAt](./wasmgpu-annotationtoolkit-pickhoverat.md)
