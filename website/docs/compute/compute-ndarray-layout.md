# compute.ndarray#layout

## Summary
compute.ndarray#layout returns a copy of the ndarray layout metadata.
The result includes shape, byte strides, and byte offset.
Use this when reconstructing equivalent arrays, wrapping buffers, or debugging indexing behavior.
The returned arrays are copies, so modifying them does not mutate the original ndarray.

## Syntax
```ts
Ndarray.layout(): { shape: number[]; stridesBytes: number[]; offsetBytes: number }
const layout = ndarray.layout();
```

## Parameters
This API does not take parameters.

## Returns
`{ shape: number[]; stridesBytes: number[]; offsetBytes: number }` - Copy of ndarray layout metadata.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const a = wgpu.compute.CPUndarray.empty("u32", { shape: [16, 8] });
const layout = a.layout();
console.log(layout.shape, layout.stridesBytes, layout.offsetBytes);
a.destroy();
```

## See Also
- [compute.ndarray#ndim](./compute-ndarray-ndim.md)
- [compute.ndarray#isContiguousC](./compute-ndarray-iscontiguousc.md)
- [compute.CPUndarray.empty](./compute-cpundarray-empty.md)
- [compute.GPUndarray.wrap](./compute-gpundarray-wrap.md)
- [compute.ndarray#residency](./compute-ndarray-residency.md)
- [compute.CPUndarray#destroy](./compute-cpundarray-destroy.md)
