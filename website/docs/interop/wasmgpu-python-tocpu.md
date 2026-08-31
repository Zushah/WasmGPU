# WasmGPU.python.toCPU

## Summary
WasmGPU.python.toCPU copies a validated Python buffer into a new owning `CPUndarray`.
The returned ndarray has the source dtype and shape and remains valid after the Python buffer proxy is released.

## Syntax
```ts
WasmGPU.python.toCPU(src: PythonArraySource): CPUndarray
const array = wgpu.python.toCPU(src);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `src` | `PythonArraySource` | Yes | C-contiguous Python buffer or proxy exposing `getBuffer()`. |

## Returns
`CPUndarray` - New owning CPU ndarray containing a copy of the source data.

## Type Details
```ts
type PythonArraySource = PyProxyLike | PyBufferLike;
```

The source must be C-contiguous and use `i8`, `u8`, `i16`, `u16`, `i32`, `u32`, `f32`, or `f64`. Shape, strides, offset, item size, and byte range are validated before allocation. A buffer acquired through `getBuffer()` is released even when validation or copying fails.

## Example
```js
const array = wgpu.python.toCPU(pythonArray);
console.log(array.dtype, array.shape, array.data());
```

## See Also
- [WasmGPU.python](./wasmgpu-python.md)
- [WasmGPU.python.toGPU](./wasmgpu-python-togpu.md)
- [WasmGPU.python.copyInto](./wasmgpu-python-copyinto.md)
