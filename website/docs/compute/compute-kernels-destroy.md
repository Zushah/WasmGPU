# compute.kernels.destroy

## Summary
compute.kernels.destroy releases resources owned by the kernel service.
Use it when you no longer need kernel helpers.
`WasmGPU.compute.destroy()` calls this automatically during compute teardown.
After destroy, kernel methods should not be used on that instance.
This does not destroy input, output, or result buffers created or returned by kernel calls; those remain caller-owned.

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
const result = wgpu.compute.kernels.sumF32(input);

result.destroy();
input.destroy();
wgpu.destroy();
```

## See Also
- [compute.destroy](./compute-destroy.md)
- [compute.kernels.reduceF32](./compute-kernels-reducef32.md)
- [compute.kernels.reduceU32](./compute-kernels-reduceu32.md)
- [compute.kernels.scanExclusiveU32](./compute-kernels-scanexclusiveu32.md)
- [compute.kernels.radixSortKeysU32](./compute-kernels-radixsortkeysu32.md)
