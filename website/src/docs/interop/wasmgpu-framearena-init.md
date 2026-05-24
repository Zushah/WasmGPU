# WasmGPU.frameArena.init

## Summary
WasmGPU.frameArena.init initializes or reinitializes the global frame arena capacity.
Calling init refreshes the frame-arena epoch and returns the base pointer.
`WasmGPU.create()` already initializes the frame arena for normal runtime usage, so call this only when you need a different capacity.

## Syntax
```ts
WasmGPU.frameArena.init(capBytes?: number): number
const basePtr = wgpu.frameArena.init(capBytes);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `capBytes` | `number` | No | Frame arena capacity in bytes, default `8 * 1024 * 1024`. |

## Returns
`number` - Base pointer (Wasm address) for the frame arena block.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const basePtr = wgpu.frameArena.init(16 * 1024 * 1024);
console.log(basePtr, wgpu.frameArena.capBytes());
```

## See Also
- [WasmGPU.frameArena.capBytes](./wasmgpu-framearena-capbytes.md)
- [WasmGPU.frameArena.epoch](./wasmgpu-framearena-epoch.md)
- [WasmGPU.frameArena.reset](./wasmgpu-framearena-reset.md)
