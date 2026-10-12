# Render

The render subsystem covers core engine lifecycle, runtime configuration, warmup, transforms, culling, and frame-level rendering utilities.

## In This Section

- Creating and initializing a `WasmGPU` instance
- Prebuilding render resources before the first visible frame
- Driving and stopping render loops
- Directional shadow configuration through `WasmGPU.effects.shadows`
- Camera/render submission flow, object-specific sorting, culling, and post-processing
- Performance and culling statistics
- Transform graph operations

## Overview Video

<video controls preload="metadata" poster="../assets/images/website-video-render.png">
    <source src="../assets/videos/render.mp4" type="video/mp4">
    <track kind="captions" src="../assets/videos/render.vtt" srclang="en" label="English">
</video>

## Suggested Starting Points

- [WasmGPU.create](./wasmgpu-create.md)
- [WasmGPU.warmup](./wasmgpu-warmup.md)
- [WasmGPU.render](./wasmgpu-render.md)
- [WasmGPU.run](./wasmgpu-run.md)
- [WasmGPU.cullingStats](./wasmgpu-cullingstats.md)
- [WasmGPU.effects](./wasmgpu-effects.md)
- [effects.shadows](./effects-shadows.md)
- [WasmGPU.createTransform](./wasmgpu-createtransform.md)

Use the sidebar to browse the full API list in this section.
