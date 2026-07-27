# WasmGPU.compute.ndarray.residency

## Summary
WasmGPU.compute.ndarray.residency identifies where ndarray data currently lives.
CPUndarray instances report `"cpu-webassembly"` and GPUndarray instances report `"gpu-storagebuffer"`.
Use this to route operations to CPU APIs or GPU dispatch paths.
This property is read-only and intrinsic to the concrete ndarray type.

## Syntax
```ts
WasmGPU.compute.ndarray.residency: NdarrayResidency
const where = ndarray.residency;
```

## Parameters
This API does not take parameters.

## Returns
`NdarrayResidency` - Data residency enum for the ndarray.

## Type Details
```ts
type NdarrayResidency = "cpu-webassembly" | "gpu-storagebuffer";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const cpu = wgpu.compute.CPUndarray.empty("f32", { shape: [4, 4] });
const gpu = cpu.uploadToGPU(wgpu.gpu, { copySrc: true });

console.log(cpu.residency, gpu.residency);
cpu.destroy();
gpu.destroy();
```

## See Also
- [WasmGPU.compute.CPUndarray.uploadToGPU](./wasmgpu-compute-cpundarray-uploadtogpu.md)
- [WasmGPU.compute.GPUndarray.readbackToCPU](./wasmgpu-compute-gpundarray-readbacktocpu.md)
- [WasmGPU.compute.ndarray.layout](./wasmgpu-compute-ndarray-layout.md)
- [WasmGPU.compute.ndarray.wgslScalarType](./wasmgpu-compute-ndarray-wgslscalartype.md)
- [WasmGPU.compute.ndarray.ndim](./wasmgpu-compute-ndarray-ndim.md)
- [WasmGPU.compute.CPUndarray.destroy](./wasmgpu-compute-cpundarray-destroy.md)
