# compute.ndarray#residency

## Summary
compute.ndarray#residency identifies where ndarray data currently lives.
CPUndarray instances report `"cpu-webassembly"` and GPUndarray instances report `"gpu-storagebuffer"`.
Use this to route operations to CPU APIs or GPU dispatch paths.
This property is read-only and intrinsic to the concrete ndarray type.

## Syntax
```ts
Ndarray.residency: NdarrayResidency
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
- [compute.CPUndarray#uploadToGPU](./compute-cpundarray-uploadtogpu.md)
- [compute.GPUndarray#readbackToCPU](./compute-gpundarray-readbacktocpu.md)
- [compute.ndarray#layout](./compute-ndarray-layout.md)
- [compute.ndarray#wgslScalarType](./compute-ndarray-wgslscalartype.md)
- [compute.ndarray#ndim](./compute-ndarray-ndim.md)
- [compute.CPUndarray#destroy](./compute-cpundarray-destroy.md)
