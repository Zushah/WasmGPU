# WasmGPU.compute.kernels.destroy

## Summary
WasmGPU.compute.kernels.destroy clears kernel pipeline caches and releases scratch-buffer pool resources.
Use this to free compute-kernel internals when you no longer need kernel helpers.
`WasmGPU.compute.destroy()` calls this automatically during compute teardown.
After destroy, kernel methods should not be used on that instance.

## Syntax
```ts
WasmGPU.compute.kernels.destroy(): void
wgpu.compute.kernels.destroy();
```

## Parameters
This API does not take parameters.

## Returns
`void` - This method does not return a value.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const input = wgpu.compute.createStorageBuffer({ data: new Float32Array([1, 2, 3]), copySrc: true });
wgpu.compute.kernels.sumF32(input);

wgpu.compute.kernels.destroy();
wgpu.destroy();
```

## See Also
- [WasmGPU.compute.destroy](./wasmgpu-compute-destroy.md)
- [WasmGPU.compute.kernels.reduceF32](./wasmgpu-compute-kernels-reducef32.md)
- [WasmGPU.compute.kernels.reduceU32](./wasmgpu-compute-kernels-reduceu32.md)
- [WasmGPU.compute.kernels.scanExclusiveU32](./wasmgpu-compute-kernels-scanexclusiveu32.md)
- [WasmGPU.compute.kernels.radixSortKeysU32](./wasmgpu-compute-kernels-radixsortkeysu32.md)
