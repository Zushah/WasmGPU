# WasmGPU.python.free

## Summary
WasmGPU.python.free releases memory for handles allocated with `kind: "heap"`.
Calling free on `frame` or `arena` handles throws because those lifetimes are reset-driven.

## Syntax
```ts
WasmGPU.python.free(handle: WasmNdarrayHandle): void
wgpu.python.free(handle);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `handle` | `WasmNdarrayHandle` | Yes | Handle to free; must have `kind === "heap"`. |

## Returns
`void` - No value is returned.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const handle = wgpu.python.sendNdarray(new Uint8Array([1, 2, 3]), { dtype: "u8", shape: [3], allocator: "heap" });
wgpu.python.free(handle);
```

## See Also
- [WasmGPU.python.sendNdarray](./wasmgpu-python-sendndarray.md)
- [WasmGPU.frameArena.reset](./wasmgpu-framearena-reset.md)
- [WasmGPU.createHeapArena](./wasmgpu-createheaparena.md)
