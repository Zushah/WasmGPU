# WasmGPU.create

## Summary
WasmGPU.create initializes WebGPU and the WebAssembly driver, then returns a ready engine instance bound to a canvas.
Use this as the entry point for rendering, compute, interaction, overlays, and interop workflows.
The call is asynchronous because adapter/device creation, canvas-context setup, and WASM startup all complete before the engine is returned.

## Syntax
```ts
WasmGPU.create(canvas: HTMLCanvasElement, descriptor?: WasmGPUDescriptor): Promise<WasmGPU>
const wgpu = await WasmGPU.create(canvas, descriptor);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `canvas` | `HTMLCanvasElement` | Yes | Canvas that receives GPU presentation and input events for engine subsystems. |
| `descriptor` | `WasmGPUDescriptor` | No | Renderer initialization options such as presentation format, culling behavior, antialiasing, and requested WebGPU limits. |

## Returns
`Promise<WasmGPU>` - Resolves to an initialized WasmGPU engine instance.

## Type Details
### WasmGPUDescriptor
```ts
type WasmGPUDescriptor = RendererDescriptor & {
    // Future options: physics, audio, etc.
};
```

`WasmGPUDescriptor` currently adds no engine-only creation fields beyond `RendererDescriptor`.

### RendererDescriptor
```ts
type RendererDescriptor = {
    antialias?: boolean;
    powerPreference?: "high-performance" | "low-power";
    canvasFormat?: GPUTextureFormat;
    frustumCulling?: boolean;
    frustumCullingStats?: boolean;
    occlusionCulling?: boolean;
    occlusionCullingStats?: boolean;
    maxBufferSize?: number;
    maxStorageBufferBindingSize?: number;
    maxUniformBufferBindingSize?: number;
};
```

#### RendererDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `antialias` | `boolean` | No | Enables WasmGPU's SMAA antialiasing path. Default `false`. |
| `powerPreference` | `"high-performance" \| "low-power"` | No | Forwarded to `navigator.gpu.requestAdapter(...)`. Default `"high-performance"`. |
| `canvasFormat` | `GPUTextureFormat` | No | Overrides the canvas presentation format. If omitted, WasmGPU uses the browser's preferred WebGPU canvas format and falls back to `rgba8unorm` when needed. |
| `frustumCulling` | `boolean` | No | Enables frustum culling for bounded renderable objects before draw submission. Default `true`. |
| `frustumCullingStats` | `boolean` | No | Populates `WasmGPU.cullingStats.frustum` during render frames. Default `false`. |
| `occlusionCulling` | `boolean` | No | Enables previous-frame, render-only occlusion filtering for eligible opaque objects. Default `false`. |
| `occlusionCullingStats` | `boolean` | No | Populates `WasmGPU.cullingStats.occlusion` when render-time occlusion filtering runs. Default `false`. |
| `maxBufferSize` | `number` | No | Requested as a required WebGPU device limit for maximum buffer size. Use this only when you know the target adapter supports the requested value. |
| `maxStorageBufferBindingSize` | `number` | No | Requested as a required WebGPU device limit for maximum storage-buffer binding size. |
| `maxUniformBufferBindingSize` | `number` | No | Requested as a required WebGPU device limit for maximum uniform-buffer binding size. |

## Notes
- The limit fields are forwarded into WebGPU device creation as required limits, so unsupported values can cause `WasmGPU.create(...)` to reject during initialization.
- `occlusionCulling` is a render-path feature. It does not change how picking queries are resolved.

## Example
```js
const canvas = document.querySelector("canvas");
const descriptor = {
    antialias: true,
    powerPreference: "high-performance",
    frustumCulling: true,
    occlusionCulling: true,
    occlusionCullingStats: true
};
const wgpu = await WasmGPU.create(canvas, descriptor);
console.log(wgpu.gpu.format);
```

## See Also
- [WasmGPU.warmup](./wasmgpu-warmup.md)
- [WasmGPU.run](./wasmgpu-run.md)
- [WasmGPU.render](./wasmgpu-render.md)
- [WasmGPU.cullingStats](./wasmgpu-cullingstats.md)
- [WasmGPU.destroy](./wasmgpu-destroy.md)
- [WasmGPU.gpu](./wasmgpu-gpu.md)
- [WasmGPU.createPerformanceStats](./wasmgpu-createperformancestats.md)
- [WasmGPU.createTransform](./wasmgpu-createtransform.md)
