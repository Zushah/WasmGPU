# WasmGPU.frameArena.alloc

## Summary
WasmGPU.frameArena.alloc allocates raw bytes from the global frame arena.
This is the low-level pointer API used when you need custom byte layouts.
Memory becomes invalid after `frameArena.reset()`, the next `WasmGPU.run()` frame reset, or a standalone `WasmGPU.render()` call that resets the frame arena.

## Syntax
```ts
WasmGPU.frameArena.alloc(bytes: number, align?: number): number
const ptr = wgpu.frameArena.alloc(bytes, align);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `bytes` | `number` | Yes | Number of bytes to reserve from the frame arena. |
| `align` | `number` | No | Alignment in bytes, default `16`. |

## Returns
`number` - Wasm pointer to the allocated byte region.

## Notes
- This method returns a raw pointer, not a `WasmSlice`.
- Use `wgpu.driver.view(...)` or `wgpu.driver.viewOn(...)` when you need a typed view over the allocated bytes.
- If you want epoch-checked slice objects instead of raw pointers, use `wgpu.driver.frame.allocU8(...)`.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const ptr = wgpu.frameArena.alloc(4096, 32);
const view = wgpu.driver.view(Uint8Array, ptr, 4096);
view.fill(0);
```

## See Also
- [WasmGPU.frameArena.allocF32](./wasmgpu-framearena-allocf32.md)
- [WasmGPU.driver](./wasmgpu-driver.md)
- [WasmGPU.frameArena.reset](./wasmgpu-framearena-reset.md)
