# WasmGPU.compute.CPUndarray.uploadToGPU

## Summary
WasmGPU.compute.CPUndarray.uploadToGPU uploads CPU ndarray bytes into a newly created GPU storage-buffer ndarray.
The output is a `GPUndarray` with copied dtype/layout metadata.
Use this to move prepared CPU arrays into compute pipelines.
Optional storage-buffer descriptor fields control GPU usage flags and labels.

## Syntax
```ts
WasmGPU.compute.CPUndarray.uploadToGPU(ctx: { device: GPUDevice; queue: GPUQueue }, desc?: Omit<StorageBufferDescriptor, "byteLength" | "data">): GPUndarray
const gpuArray = cpuArray.uploadToGPU(wgpu.gpu, desc);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `ctx` | `{ device: GPUDevice; queue: GPUQueue }` | Yes | GPU device/queue context used to allocate and upload the storage buffer. |
| `desc` | `Omit<StorageBufferDescriptor, "byteLength" \| "data">` | No | Optional storage-buffer flags (`label`, `copySrc`, `copyDst`, `usage`). |

## Returns
`GPUndarray` - GPU-resident ndarray backed by a `StorageBuffer`.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const cpu = wgpu.compute.CPUndarray.fromArray("f32", [4], new Float32Array([1, 2, 3, 4]));
const gpu = cpu.uploadToGPU(wgpu.gpu, { copySrc: true, label: "cpu-upload" });

console.log(cpu.residency, gpu.residency);
cpu.destroy();
gpu.destroy();
```

## See Also
- [WasmGPU.compute.GPUndarray.readbackToCPU](./wasmgpu-compute-gpundarray-readbacktocpu.md)
- [WasmGPU.compute.GPUndarray.empty](./wasmgpu-compute-gpundarray-empty.md)
- [WasmGPU.compute.GPUndarray.wrap](./wasmgpu-compute-gpundarray-wrap.md)
- [WasmGPU.compute.CPUndarray.empty](./wasmgpu-compute-cpundarray-empty.md)
- [WasmGPU.compute.createStorageBuffer](./wasmgpu-compute-createstoragebuffer.md)
- [WasmGPU.compute.CPUndarray.destroy](./wasmgpu-compute-cpundarray-destroy.md)
