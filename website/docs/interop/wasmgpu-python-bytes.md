# WasmGPU.python.bytes

## Summary
WasmGPU.python.bytes returns a byte view of a Python interop handle region.
Use this for raw serialization, hashing, and binary transport tasks.
The call rejects heap handles freed through `WasmGPU.python.free`. The byte view is borrowed and must not be used after the handle is freed or its allocator is reset. Frame and arena handles are epoch-scoped, but this method does not validate their epochs.

## Syntax
```ts
WasmGPU.python.bytes(handle: WasmNdarrayHandle): Uint8Array
const bytes = wgpu.python.bytes(handle);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `handle` | `WasmNdarrayHandle` | Yes | Handle describing the Wasm ndarray payload. |

## Returns
`Uint8Array` - Byte slice covering `handle.byteLength` from `handle.ptr`.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const handle = wgpu.python.sendNdarray(new Float32Array([1.5, 2.5]), { dtype: "f32", shape: [2], allocator: "heap" });
const bytes = wgpu.python.bytes(handle);
console.log(bytes.byteLength, bytes[0], bytes[1], bytes[2], bytes[3]);
wgpu.python.free(handle);
```

## See Also
- [WasmGPU.python.view](./wasmgpu-python-view.md)
- [WasmGPU.python.sendNdarray](./wasmgpu-python-sendndarray.md)
