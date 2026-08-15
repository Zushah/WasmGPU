# WasmGPU.python.view

## Summary
WasmGPU.python.view returns a typed-array view for a Python interop handle.
The returned array points directly into Wasm memory and reflects in-place changes.
The call rejects heap handles freed through `WasmGPU.python.free`. A returned view is borrowed and must not be used after the handle is freed or its allocator is reset. Frame and arena handles are epoch-scoped, but this method does not validate their epochs.

## Syntax
```ts
WasmGPU.python.view(handle: WasmNdarrayHandle): NumberTypedArray
const view = wgpu.python.view(handle);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `handle` | `WasmNdarrayHandle` | Yes | Handle produced by `sendNdarray`. |

## Returns
`NumberTypedArray` - Typed array matching `handle.dtype`.

## Type Details
```ts
type NumberTypedArray =
    Int8Array | Uint8Array | Int16Array | Uint16Array |
    Int32Array | Uint32Array | Float32Array | Float64Array;
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const handle = wgpu.python.sendNdarray(new Uint32Array([10, 20, 30]), { dtype: "u32", shape: [3], allocator: "heap" });
const view = wgpu.python.view(handle);
view[1] = 99;
console.log(view);
wgpu.python.free(handle);
```

## See Also
- [WasmGPU.python.bytes](./wasmgpu-python-bytes.md)
- [WasmGPU.python.receiveNdarray](./wasmgpu-python-receivendarray.md)
