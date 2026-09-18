# createAnnotation.toolkit#destroy

## Summary
createAnnotation.toolkit#destroy calls `detach()` and then disposes marker-renderer resources owned by the toolkit.
If `markerRenderer.glyphField` was supplied by the caller, it is detached but not destroyed. Stored annotation records and registered toolkit listeners are not cleared by this method; do not reuse the toolkit after destroying its owned renderer.
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
- [createAnnotation.toolkit#detach](./createannotation-toolkit-detach.md)
