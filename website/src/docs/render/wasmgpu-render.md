# WasmGPU.render

## Summary
WasmGPU.render submits one frame using the provided scene and camera.
If the engine is not currently running a loop, the frame arena is reset before rendering.
Use this for manual render control such as single-frame rendering, custom timing loops, or explicit stepping around UI events.

## Syntax
```ts
WasmGPU.render(scene: Scene, camera: Camera): void
wgpu.render(scene, camera);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `scene` | `Scene` | Yes | Scene contents containing meshes, point clouds, glyph fields, nodelinks, splatfields, latticespaces, and lights used for the frame. |
| `camera` | `Camera` | Yes | Active camera supplying the view and projection transforms for this frame. |

## Returns
`void` - Encodes and submits render work for the current frame.

## Frame Behavior
1. `render()` checks the canvas size and device-pixel-ratio-backed render targets, then resizes depth, picking, transmission, and SMAA resources when needed.
2. It updates the camera aspect ratio, runs transform propagation, writes camera and lighting uniforms, and builds draw lists for meshes, point clouds, glyph fields, nodelinks, splatfields, and latticespaces.
3. It applies frustum culling when enabled. If occlusion culling is enabled and a valid previous-frame hierarchy is available, it can further filter eligible opaque meshes, point clouds, glyph fields, nodelinks, and latticespaces for the current render only. Splatfields are excluded from occlusion culling.
4. It renders opaque content first. When transmissive `StandardMaterial` objects are present, the renderer prepares an internal scene-color source/copy path and uses transmission-aware shader variants. Before transparent drawing, each visible splatfield is sorted by camera depth, as are the visible cells of each transparent 3D latticespace.
5. If `antialias` was enabled during `WasmGPU.create(...)`, SMAA runs after the main render passes.

Render-time occlusion filtering is separate from picking and warmup. It is not used to answer picks or to prewarm resources.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const scene = wgpu.createScene([0.06, 0.07, 0.09]);
const camera = wgpu.createCamera.perspective({ fov: Math.PI / 3, aspect: canvas.width / Math.max(1, canvas.height), near: 0.1, far: 1000 });
camera.transform.setPosition(0, 0, 5);
wgpu.render(scene, camera);
```

## See Also
- [WasmGPU.create](./wasmgpu-create.md)
- [WasmGPU.warmup](./wasmgpu-warmup.md)
- [WasmGPU.run](./wasmgpu-run.md)
- [WasmGPU.stop](./wasmgpu-stop.md)
- [WasmGPU.cullingStats](./wasmgpu-cullingstats.md)
- [WasmGPU.createScene](../world/wasmgpu-createscene.md)
- [WasmGPU.createCamera.perspective](../world/wasmgpu-createcamera-perspective.md)
- [WasmGPU.gpu](./wasmgpu-gpu.md)
