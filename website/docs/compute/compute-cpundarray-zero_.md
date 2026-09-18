# compute.CPUndarray#zero_

## Summary
compute.CPUndarray#zero_ fills the ndarray backing storage with zeros in place.
It resets all represented values regardless of current layout.
Use this to reuse existing allocations without reallocating.
This operation mutates the current ndarray.

## Syntax
```ts
CPUndarray.zero_(): void
a.zero_();
```

## Parameters
This API does not take parameters.

## Returns
`void` - This method does not return a value.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const a = wgpu.compute.CPUndarray.fromArray("u32", [4], new Uint32Array([1, 2, 3, 4]));
a.zero_();
console.log(Array.from(a.data()));
a.destroy();
```

## See Also
- [compute.CPUndarray.zeros](./compute-cpundarray-zeros.md)
- [compute.CPUndarray#backingBytes](./compute-cpundarray-backingbytes.md)
- [compute.CPUndarray#set](./compute-cpundarray-set.md)
- [compute.CPUndarray.empty](./compute-cpundarray-empty.md)
- [compute.CPUndarray#uploadToGPU](./compute-cpundarray-uploadtogpu.md)
- [compute.CPUndarray#destroy](./compute-cpundarray-destroy.md)
