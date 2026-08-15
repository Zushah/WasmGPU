# WasmGPU.createAnnotation.toolkit().destroy

## Summary
WasmGPU.createAnnotation.toolkit().destroy fully tears down the toolkit.
It calls `detach()` and then disposes internal marker-renderer resources.
Use this when the toolkit will not be reused.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().destroy(): void
toolkit.destroy();
```

## Parameters
This API does not take parameters.

## Returns
`void` - No value is returned.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const toolkit = wgpu.createAnnotation.toolkit({ scene, camera, canvas });

window.addEventListener("beforeunload", () => toolkit.destroy());
```

## See Also
- [WasmGPU.createAnnotation.toolkit().detach](./wasmgpu-annotationtoolkit-detach.md)
