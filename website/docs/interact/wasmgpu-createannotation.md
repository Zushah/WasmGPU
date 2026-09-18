# WasmGPU.createAnnotation

## Summary
WasmGPU.createAnnotation is the annotation factory facade. Its toolkit factory combines engine picking with overlay and scene integration, using the engine canvas by default while returning a caller-owned toolkit.

## Syntax
```ts
const annotations = wgpu.createAnnotation.toolkit();
```

## Available APIs
- [createAnnotation.toolkit](./createannotation-toolkit.md) creates the annotation toolkit.
- [createAnnotation.toolkit#attach](./createannotation-toolkit-attach.md) connects it to scene, camera, and overlay state.
- [createAnnotation.toolkit#setMode](./createannotation-toolkit-setmode.md) selects the active annotation workflow.
- [createAnnotation.toolkit#getAnnotations](./createannotation-toolkit-getannotations.md) returns annotation snapshots.
- [createAnnotation.toolkit#destroy](./createannotation-toolkit-destroy.md) releases toolkit-owned resources.

## See Also
- [WasmGPU.pick](./wasmgpu-pick.md)
- [WasmGPU.createOverlay](../world/wasmgpu-createoverlay.md)
