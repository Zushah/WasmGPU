# createAnnotation.toolkit#detach

## Summary
createAnnotation.toolkit#detach unbinds pointer handlers, removes overlay label layer, detaches marker rendering, and clears staging/readout state.
If the toolkit auto-created its overlay system, detach also destroys that owned overlay.
Annotation records, listeners, unit settings, and mode are preserved, so the toolkit can be attached again. A caller-supplied overlay system is not destroyed.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().detach(): this
toolkit.detach();
```

## Parameters
This API does not take parameters.

## Returns
`this` - Returns the same toolkit instance.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const toolkit = wgpu.createAnnotation.toolkit({ scene, camera, canvas });

toolkit.detach();
```

## See Also
- [createAnnotation.toolkit#attach](./createannotation-toolkit-attach.md)
- [createAnnotation.toolkit#destroy](./createannotation-toolkit-destroy.md)
