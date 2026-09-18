# createAnnotation.toolkit#removeSelectionAnnotation

## Summary
createAnnotation.toolkit#removeSelectionAnnotation removes the annotation currently referenced by `selectionProbe`.
This is useful when annotation glyphs are pickable and the selected annotation should be deleted directly.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().removeSelectionAnnotation(): boolean
const removed = toolkit.removeSelectionAnnotation();
```

## Parameters
This API does not take parameters.

## Returns
`boolean` - `true` if a selected annotation existed and was removed.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene();
const camera = wgpu.createCamera.perspective({ fov: 55, aspect: canvas.clientWidth / canvas.clientHeight, near: 0.1, far: 1000 });
const toolkit = wgpu.createAnnotation.toolkit({ scene, camera, canvas });

document.addEventListener("keydown", (event) => {
    if (event.key !== "Delete") return;
    console.log(toolkit.removeSelectionAnnotation());
});
```

## See Also
- [createAnnotation.toolkit#selectionProbe](./createannotation-toolkit-selectionprobe.md)
- [createAnnotation.toolkit#removeAnnotation](./createannotation-toolkit-removeannotation.md)
