# WasmGPU.frameArena.allocF32

## Summary
WasmGPU.frameArena.allocF32 allocates contiguous float32 storage in the global frame arena.
It returns a raw pointer; use `WasmGPU.driver.view(Float32Array, ptr, len)` to access values.

## Syntax
```ts
WasmGPU.frameArena.allocF32(len: number): number
const ptr = wgpu.frameArena.allocF32(len);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `len` | `number` | Yes | Number of `float32` elements to allocate. |

## Returns
`number` - Pointer to the first float32 element.

## Notes
- This method is a convenience for transient `float32` storage, but it still returns a raw pointer.
- Use `wgpu.driver.frame.allocF32(...)` instead when you want a `WasmSlice<Float32Array>` with epoch-aware `isAlive()` and `assertAlive()` checks.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const ptr = wgpu.frameArena.allocF32(16);
const m = wgpu.driver.view(Float32Array, ptr, 16);
m.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
```

## See Also
- [WasmGPU.frameArena.alloc](./wasmgpu-framearena-alloc.md)
- [WasmGPU.driver](./wasmgpu-driver.md)
- [WasmGPU.frameArena.reset](./wasmgpu-framearena-reset.md)
