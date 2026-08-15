# WasmGPU.python.receiveNdarray

## Summary
WasmGPU.python.receiveNdarray materializes handle data into a transfer object containing dtype, shape, and typed data.
By default it returns a direct view; with `copy: true` it returns an owned copy.
The call rejects heap handles freed through `WasmGPU.python.free`. With the default `copy: false`, `data` remains borrowed and must not outlive the handle; a `copy: true` result remains usable after the handle is released. Frame and arena handles are epoch-scoped, but this method does not validate their epochs.

## Syntax
```ts
WasmGPU.python.receiveNdarray(handle: WasmNdarrayHandle, options?: ReceiveNdarrayOptions): NdarrayTransfer
const transfer = wgpu.python.receiveNdarray(handle, options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `handle` | `WasmNdarrayHandle` | Yes | Source handle to read from. |
| `options` | `ReceiveNdarrayOptions` | No | Controls whether data is returned as a copy (`copy: true`) or view (`copy: false`, default). |

## Returns
`NdarrayTransfer` - Transfer object with `{ dtype, shape, data }`.

## Type Details
```ts
type ReceiveNdarrayOptions = {
    copy?: boolean; // default: false
};

type NdarrayTransfer = {
    dtype: "i8" | "u8" | "i16" | "u16" | "i32" | "u32" | "f32" | "f64";
    shape: number[];
    data: NumberTypedArray;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const handle = wgpu.python.sendNdarray(new Int16Array([3, 1, 4, 1]), { dtype: "i16", shape: [2, 2], allocator: "heap" });
const transfer = wgpu.python.receiveNdarray(handle, { copy: true });
console.log(transfer.dtype, transfer.shape, transfer.data);
wgpu.python.free(handle);
```

## See Also
- [WasmGPU.python.view](./wasmgpu-python-view.md)
- [WasmGPU.python.sendNdarray](./wasmgpu-python-sendndarray.md)
