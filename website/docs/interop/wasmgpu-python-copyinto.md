# WasmGPU.python.copyInto

## Summary
WasmGPU.python.copyInto copies a validated Python buffer into an existing C-contiguous `CPUndarray` or `GPUndarray`.
Source and destination dtype, shape, and byte length must match. A GPU destination must have `GPUBufferUsage.COPY_DST`.

## Syntax
```ts
WasmGPU.python.copyInto(dst: CPUndarray | GPUndarray, src: PythonArraySource): void
wgpu.python.copyInto(dst, src);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `dst` | `CPUndarray \| GPUndarray` | Yes | Existing C-contiguous destination ndarray. |
| `src` | `PythonArraySource` | Yes | Matching C-contiguous Python buffer or proxy. |

## Returns
`void`

## Example
```js
const dst = wgpu.python.toGPU(initialPythonArray);
wgpu.python.copyInto(dst, updatedPythonArray);
```

## See Also
- [WasmGPU.python](./wasmgpu-python.md)
- [WasmGPU.python.toCPU](./wasmgpu-python-tocpu.md)
- [WasmGPU.python.toGPU](./wasmgpu-python-togpu.md)
