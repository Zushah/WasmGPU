# WasmGPU.createAnnotation.toolkit().clearAnnotations

## Summary
WasmGPU.createAnnotation.toolkit().clearAnnotations removes all records from the annotation store.
This resets marker/distance/angle annotations but keeps toolkit configuration and event wiring intact.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().clearAnnotations(): this
toolkit.clearAnnotations();
```

## Parameters
This API does not take parameters.

## Returns
`this` - Returns the same toolkit.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const toolkit = wgpu.createAnnotation.toolkit({ scene, camera, canvas });

toolkit.clearAnnotations();
```

## See Also
- [WasmGPU.createAnnotation.toolkit().removeAnnotation](./wasmgpu-annotationtoolkit-removeannotation.md)
- [WasmGPU.createAnnotation.toolkit().revision](./wasmgpu-annotationtoolkit-revision.md)
