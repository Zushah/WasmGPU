# WasmGPU.createHeapArena

## Summary
WasmGPU.createHeapArena creates a caller-managed arena inside WasmGPU's built-in WebAssembly driver memory.
Use it when your staging data should outlive a single frame, but you still want a clear reset or destroy point instead of independent heap allocations.
Arena allocations return either raw pointers or `WasmSlice` wrappers, and they become invalid after the arena resets or is destroyed.

## Syntax
```ts
WasmGPU.createHeapArena(capBytes: number, align?: number): WasmHeapArena
WasmGPU.driver.createHeapArena(capBytes: number, align?: number): WasmHeapArena
const arena = wgpu.createHeapArena(capBytes, align);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `capBytes` | `number` | Yes | Total arena capacity in bytes; must be greater than zero. |
| `align` | `number` | No | Base alignment expectation for the arena allocation, default `16`. |

## Returns
`WasmHeapArena` - Arena object with allocation and lifecycle methods.

## Type Details
```ts
type WasmHeapArena = {
    readonly basePtr: number;
    readonly capBytes: number;
    epoch(): number;
    usedBytes(): number;
    reset(): void;
    destroy(): void;
    alloc(bytes: number, alignBytes?: number): number;
    allocF32(len: number): WasmSlice<Float32Array>;
    allocU32(len: number): WasmSlice<Uint32Array>;
    allocI32(len: number): WasmSlice<Int32Array>;
    allocU8(len: number, alignBytes?: number): WasmSlice<Uint8Array>;
};
```

#### WasmHeapArena Fields and Methods
- `basePtr` is the base Wasm address for the arena allocation.
- `capBytes` is the total capacity in bytes.
- `usedBytes()` reports how much of that capacity is currently consumed.
- `reset()` rewinds the arena head and bumps the arena epoch.
- `destroy()` invalidates the arena permanently.
- `alloc(bytes, alignBytes?)` returns a raw Wasm pointer for custom layouts.
- `allocF32`, `allocU32`, `allocI32`, and `allocU8` return `WasmSlice` wrappers with epoch-aware lifetime checks.

#### Arena Lifetime
- Arena slices use `kind: "arena"` and become invalid after `reset()` or `destroy()`.
- `WasmSlice.isAlive()` and `assertAlive()` use the arena epoch to catch stale access.
- `WasmSlice.free()` is only for heap-owned slices. Arena slices end their lifetime through arena reset or destroy.
- This is a staging arena, not a general-purpose per-slice free list. Use `reset()` to reuse its storage as a block.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const arena = wgpu.createHeapArena(4 * 1024 * 1024, 16);
const weights = arena.allocF32(4);
weights.write([0.5, 1.0, 1.5, 2.0]);

console.log(weights.view()[2], arena.usedBytes(), arena.epoch());
arena.reset();
arena.destroy();
```

## See Also
- [WasmGPU.driver](./wasmgpu-driver.md)
- [WasmGPU.frameArena](./wasmgpu-framearena.md)
- [WasmGPU.python](./wasmgpu-python.md)
