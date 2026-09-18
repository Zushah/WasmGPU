# compute.CPUndarray#uploadToGPU

## Summary
compute.CPUndarray#uploadToGPU uploads CPU ndarray bytes into a newly created GPU storage-buffer ndarray.
The output is a `GPUndarray` with copied dtype/layout metadata.
Use this to move prepared CPU arrays into compute pipelines.
Optional storage-buffer descriptor fields control GPU usage flags and labels.

## Syntax
```ts
CPUndarray.uploadToGPU(ctx: { device: GPUDevice; queue: GPUQueue; readback?: ReadbackRing }, desc?: Omit<StorageBufferDescriptor, "byteLength" | "data">): GPUndarray
const gpuArray = cpuArray.uploadToGPU(wgpu.compute, desc);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `ctx` | `{ device: GPUDevice; queue: GPUQueue; readback?: ReadbackRing }` | Yes | GPU context used to upload the buffer. Supplying the compute service propagates its shared readback ring to the result. |
| `desc` | `Omit<StorageBufferDescriptor, "byteLength" \| "data">` | No | Optional storage-buffer flags (`label`, `copySrc`, `copyDst`, `usage`). |

## Returns
`GPUndarray` - GPU-resident ndarray backed by a `StorageBuffer`.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const cpu = wgpu.compute.CPUndarray.fromArray("f32", [4], new Float32Array([1, 2, 3, 4]));
const gpu = cpu.uploadToGPU(wgpu.compute, { copySrc: true, label: "cpu-upload" });

console.log(cpu.residency, gpu.residency);
cpu.destroy();
gpu.destroy();
```

## See Also
- [compute.GPUndarray#readbackToCPU](./compute-gpundarray-readbacktocpu.md)
- [compute.GPUndarray.empty](./compute-gpundarray-empty.md)
- [compute.GPUndarray.wrap](./compute-gpundarray-wrap.md)
- [compute.CPUndarray.empty](./compute-cpundarray-empty.md)
- [compute.createStorageBuffer](./compute-createstoragebuffer.md)
- [compute.CPUndarray#destroy](./compute-cpundarray-destroy.md)
