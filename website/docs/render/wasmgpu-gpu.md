# WasmGPU.gpu

## Summary
WasmGPU.gpu exposes the renderer GPU handles used by the engine.
It returns the active `GPUDevice`, `GPUQueue`, and swapchain `GPUTextureFormat`.
Use this when you need low-level WebGPU integration beside WasmGPU abstractions.

## Syntax
```ts
WasmGPU.gpu: { device: GPUDevice; queue: GPUQueue; format: GPUTextureFormat }
const gpu = wgpu.gpu;
```

## Parameters
This API does not take parameters.

## Returns
`{ device: GPUDevice; queue: GPUQueue; format: GPUTextureFormat }` - Current WebGPU handles/configuration used by the renderer.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const gpu = wgpu.gpu;
const encoder = gpu.device.createCommandEncoder();
gpu.queue.submit([encoder.finish()]);
console.log(gpu.format);
```

## See Also
- [WasmGPU.create](./wasmgpu-create.md)
- [WasmGPU.render](./wasmgpu-render.md)
- [WasmGPU.cullingStats](./wasmgpu-cullingstats.md)
- [WasmGPU.createPerformanceStats](./wasmgpu-createperformancestats.md)
