# WasmGPU.frameArena

## Summary
WasmGPU.frameArena exposes the global transient allocator inside WasmGPU's built-in WebAssembly driver memory.
Use it for scratch pointers whose lifetime should end with the current frame or render pass.
`WasmGPU.run()` resets the frame arena once per animation frame, and standalone `WasmGPU.render()` calls reset it before rendering when the engine is not already inside `run()`.

## Syntax
```ts
WasmGPU.frameArena: FrameArena
const frameArena = wgpu.frameArena;
```

## Parameters
This accessor does not take parameters.

## Returns
`FrameArena` - Frame allocator interface with init, alloc, reset, and stats methods.

## Type Details
```ts
type FrameArena = {
    init(capBytes?: number): number;
    reset(): void;
    alloc(bytes: number, align?: number): number;
    allocF32(len: number): number;
    allocF64(len: number): number;
    epoch(): number;
    usedBytes(): number;
    capBytes(): number;
};
```

## Notes
- `alloc()`, `allocF32()`, and `allocF64()` return raw Wasm pointers. Use `wgpu.driver.view(...)` to read or write those regions.
- If you want epoch-checked typed slices instead of raw pointers, use `wgpu.driver.frame.allocF32()`, `allocF64()`, `allocU32()`, `allocI32()`, or `allocU8()`.
- Do not retain frame-arena pointers, typed-array views, or frame `WasmSlice` objects across `frameArena.reset()`, across frames inside `WasmGPU.run()`, or across standalone `WasmGPU.render()` calls.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const ptr = wgpu.frameArena.allocF32(4);
const values = wgpu.driver.view(Float32Array, ptr, 4);
values.set([1, 2, 3, 4]);

console.log(values[0], wgpu.frameArena.usedBytes(), wgpu.frameArena.capBytes());
wgpu.frameArena.reset();
```

## See Also
- [WasmGPU.driver](./wasmgpu-driver.md)
- [frameArena.init](./framearena-init.md)
- [frameArena.alloc](./framearena-alloc.md)
- [frameArena.reset](./framearena-reset.md)
- [WasmGPU.createHeapArena](./wasmgpu-createheaparena.md)
