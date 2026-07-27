# WasmGPU.compute.CPUndarray.data

## Summary
WasmGPU.compute.CPUndarray.data returns a typed contiguous data view for row-major arrays.
It requires `isContiguousC === true`; otherwise it throws.
Use this for high-performance element access when layout is contiguous.
For non-contiguous layouts, use `get`/`set` or inspect `backingBytes`.

## Syntax
```ts
WasmGPU.compute.CPUndarray.data(): NumberTypedArray
const typed = a.data();
```

## Parameters
This API does not take parameters.

## Returns
`NumberTypedArray` - Typed array view of contiguous ndarray elements.

## Type Details
```ts
type NumberTypedArray =
    | Int8Array | Uint8Array
    | Int16Array | Uint16Array
    | Int32Array | Uint32Array
    | Float32Array | Float64Array;
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const a = wgpu.compute.CPUndarray.fromArray("f32", [2, 2], new Float32Array([1, 2, 3, 4]));
const data = a.data();
data[0] = 10;
console.log(Array.from(data), a.get(0, 0));
a.destroy();
```

## See Also
- [WasmGPU.compute.CPUndarray.backingBytes](./wasmgpu-compute-cpundarray-backingbytes.md)
- [WasmGPU.compute.CPUndarray.get](./wasmgpu-compute-cpundarray-get.md)
- [WasmGPU.compute.CPUndarray.set](./wasmgpu-compute-cpundarray-set.md)
- [WasmGPU.compute.ndarray.isContiguousC](./wasmgpu-compute-ndarray-iscontiguousc.md)
- [WasmGPU.compute.CPUndarray.fromArray](./wasmgpu-compute-cpundarray-fromarray.md)
- [WasmGPU.compute.CPUndarray.destroy](./wasmgpu-compute-cpundarray-destroy.md)
