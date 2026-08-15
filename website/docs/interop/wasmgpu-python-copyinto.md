# WasmGPU.python.copyInto

## Summary
WasmGPU.python.copyInto copies source data into an existing Wasm ndarray handle.
The source must match the handle shape and dtype constraints.
This enables in-place updates without reallocating a new handle.
The call rejects heap handles freed through `WasmGPU.python.free`. Frame and arena handles are epoch-scoped, but this method does not validate their epochs; callers must not reuse them after the corresponding allocator resets.

## Syntax
```ts
WasmGPU.python.copyInto(handle: WasmNdarrayHandle, src: PythonArraySource, options?: { dtype?: DType }): void
wgpu.python.copyInto(handle, src, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `handle` | `WasmNdarrayHandle` | Yes | Destination handle previously returned by `sendNdarray`. |
| `src` | `PythonArraySource` | Yes | Source data to copy into destination memory. |
| `options` | `{ dtype?: DType }` | No | Optional explicit dtype validation override. |

## Returns
`void` - No value is returned.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const handle = wgpu.python.sendNdarray(new Float32Array([0, 0, 0, 0]), { dtype: "f32", shape: [4], allocator: "heap" });
wgpu.python.copyInto(handle, new Float32Array([5, 6, 7, 8]), { dtype: "f32" });
console.log(wgpu.python.view(handle));
wgpu.python.free(handle);
```

## See Also
- [WasmGPU.python.sendNdarray](./wasmgpu-python-sendndarray.md)
- [WasmGPU.python.view](./wasmgpu-python-view.md)
