# compute.CPUndarray#data

## Summary
compute.CPUndarray#data returns a typed contiguous data view for row-major arrays.
It requires `isContiguousC === true`; otherwise it throws.
The contiguous view supports direct bulk element reads and writes. For non-contiguous layouts, use `get`/`set` or inspect `backingBytes`.
The returned typed array aliases WebAssembly memory. Discard and reacquire it after that memory grows, and do not use it after the ndarray is destroyed.

## Syntax
```ts
CPUndarray.data(): NumberTypedArray
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
- [compute.CPUndarray#backingBytes](./compute-cpundarray-backingbytes.md)
- [compute.CPUndarray#get](./compute-cpundarray-get.md)
- [compute.CPUndarray#set](./compute-cpundarray-set.md)
- [compute.ndarray#isContiguousC](./compute-ndarray-iscontiguousc.md)
- [compute.CPUndarray.fromArray](./compute-cpundarray-fromarray.md)
- [compute.CPUndarray#destroy](./compute-cpundarray-destroy.md)
