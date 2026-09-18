# compute.GPUndarray#readbackToCPU

## Summary
compute.GPUndarray#readbackToCPU copies GPU ndarray contents into a new CPUndarray.
The underlying storage buffer must support readback (`copySrc: true`).
Layout and dtype metadata are preserved in the returned CPU array.
Use this to inspect or post-process compute results on the CPU.
Arrays created through the instance compute context use its shared `ReadbackRing` while it is available; otherwise the method falls back to a direct storage-buffer read. The returned CPU ndarray owns its copy, and failed reads destroy the partially allocated destination.

## Syntax
```ts
GPUndarray.readbackToCPU(): Promise<CPUndarray>
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

const gpu = wgpu.compute.GPUndarray.empty(wgpu.compute, "f32", { shape: [4] }, { copySrc: true, copyDst: true });
const cpu = await gpu.readbackToCPU();

console.log(cpu.residency, cpu.layout());
cpu.destroy();
gpu.destroy();
```

## See Also
- [compute.CPUndarray#uploadToGPU](./compute-cpundarray-uploadtogpu.md)
- [compute.readback.readF32](./compute-readback-readf32.md)
- [compute.GPUndarray.empty](./compute-gpundarray-empty.md)
- [compute.GPUndarray.wrap](./compute-gpundarray-wrap.md)
- [compute.ndarray#residency](./compute-ndarray-residency.md)
- [compute.CPUndarray#destroy](./compute-cpundarray-destroy.md)
