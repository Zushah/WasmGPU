# WasmGPU.createAnnotation.toolkit().ingestHoverHit

## Summary
WasmGPU.createAnnotation.toolkit().ingestHoverHit injects an externally obtained pick hit into hover state.
Use this when your application owns picking and wants to feed hover data into annotation UI.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().ingestHoverHit(hit: PickResult | null): AnnotationProbeReadout
const readout = toolkit.ingestHoverHit(hit);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `hit` | `PickResult \| null` | Yes | Pick hit to map into hover readout; `null` clears hover state. |

## Returns
`AnnotationProbeReadout` - Updated hover readout.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const toolkit = wgpu.createAnnotation.toolkit({ scene, camera, canvas, autoBindPointerEvents: false });

const hit = await wgpu.pick(scene, camera, 100, 60, { includeAttributes: true });
const readout = toolkit.ingestHoverHit(hit);
console.log(readout.hit, readout.kind);
```

## See Also
- [WasmGPU.createAnnotation.toolkit().pickHoverAt](./wasmgpu-annotationtoolkit-pickhoverat.md)
- [WasmGPU.createAnnotation.toolkit().hoverProbe](./wasmgpu-annotationtoolkit-hoverprobe.md)
