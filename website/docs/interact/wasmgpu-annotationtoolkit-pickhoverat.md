# WasmGPU.createAnnotation.toolkit().pickHoverAt

## Summary
WasmGPU.createAnnotation.toolkit().pickHoverAt executes a pick query at canvas coordinates and updates hover state.
The method is token-guarded internally so stale asynchronous responses do not overwrite newer hover results.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().pickHoverAt(x: number, y: number): Promise<AnnotationProbeReadout>
const readout = await toolkit.pickHoverAt(x, y);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `x` | `number` | Yes | Canvas-space X coordinate in CSS pixels. |
| `y` | `number` | Yes | Canvas-space Y coordinate in CSS pixels. |

## Returns
`Promise<AnnotationProbeReadout>` - Resolves to the latest hover readout after pick completion.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const toolkit = wgpu.createAnnotation.toolkit({ scene, camera, canvas, autoBindPointerEvents: false });

canvas.addEventListener("pointermove", async (event) => {
    const rect = canvas.getBoundingClientRect();
    const hover = await toolkit.pickHoverAt(event.clientX - rect.left, event.clientY - rect.top);
    console.log(hover.hit, hover.objectId);
});
```

## See Also
- [WasmGPU.createAnnotation.toolkit().hoverProbe](./wasmgpu-annotationtoolkit-hoverprobe.md)
- [WasmGPU.createAnnotation.toolkit().pickAtAndCommit](./wasmgpu-annotationtoolkit-pickatandcommit.md)
