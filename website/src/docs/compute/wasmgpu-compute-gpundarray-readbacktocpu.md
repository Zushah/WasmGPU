# WasmGPU.compute.GPUndarray.readbackToCPU

## Summary
WasmGPU.compute.GPUndarray.readbackToCPU copies GPU ndarray contents into a new CPUndarray.
The underlying storage buffer must support readback (`copySrc: true`).
Layout and dtype metadata are preserved in the returned CPU array.
Use this to inspect or post-process compute results on the CPU.

## Syntax
```ts
WasmGPU.compute.GPUndarray.readbackToCPU(): Promise<CPUndarray>
const cpu = await g.readbackToCPU();
```

## Parameters
This API does not take parameters.

## Returns
`Promise<CPUndarray>` - Resolves to a CPU ndarray containing copied data.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const gpu = wgpu.compute.GPUndarray.empty(wgpu.gpu, "f32", { shape: [4] }, { copySrc: true, copyDst: true });
const cpu = await gpu.readbackToCPU();

console.log(cpu.residency, cpu.layout());
cpu.destroy();
gpu.destroy();
```

## See Also
- [WasmGPU.compute.CPUndarray.uploadToGPU](./wasmgpu-compute-cpundarray-uploadtogpu.md)
- [WasmGPU.compute.readback.readF32](./wasmgpu-compute-readbackring-readf32.md)
- [WasmGPU.compute.GPUndarray.empty](./wasmgpu-compute-gpundarray-empty.md)
- [WasmGPU.compute.GPUndarray.wrap](./wasmgpu-compute-gpundarray-wrap.md)
- [WasmGPU.compute.ndarray.residency](./wasmgpu-compute-ndarray-residency.md)
- [WasmGPU.compute.CPUndarray.destroy](./wasmgpu-compute-cpundarray-destroy.md)
