# WasmGPU.python.toGPU

## Summary
WasmGPU.python.toGPU uploads a validated Python buffer into a new owning `GPUndarray`.
The backing storage buffer enables `COPY_DST` and `COPY_SRC` by default so it can be updated and read back.

## Syntax
```ts
WasmGPU.python.toGPU(src: PythonArraySource, options?: PythonGPUTransferOptions): GPUndarray
const array = wgpu.python.toGPU(src, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `src` | `PythonArraySource` | Yes | C-contiguous Python buffer or proxy exposing `getBuffer()`. |
| `options` | `PythonGPUTransferOptions` | No | Storage-buffer label and usage controls. |

## Returns
`GPUndarray` - New owning GPU ndarray containing the uploaded source data.

## Type Details
```ts
type PythonGPUTransferOptions = {
    label?: string;
    copyDst?: boolean; // default: true
    copySrc?: boolean; // default: true
    usage?: GPUBufferUsageFlags;
};
```

The returned array owns its `StorageBuffer`; destroying the array releases that buffer. The uploaded shape, dtype, and C-order strides are copied from the validated Python source.

## Example
```js
const array = wgpu.python.toGPU(pythonArray, { label: "weights", copySrc: true });
```

## See Also
- [WasmGPU.python](./wasmgpu-python.md)
- [WasmGPU.python.toCPU](./wasmgpu-python-tocpu.md)
- [WasmGPU.python.copyInto](./wasmgpu-python-copyinto.md)
