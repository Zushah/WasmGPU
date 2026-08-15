# WasmGPU.frameArena.usedBytes

## Summary
WasmGPU.frameArena.usedBytes returns how many bytes are currently consumed in the frame arena.
Use this for debugging scratch usage and sizing the frame allocator.

## Syntax
```ts
WasmGPU.frameArena.usedBytes(): number
const used = wgpu.frameArena.usedBytes();
```

## Parameters
This API does not take parameters.

## Returns
`number` - Number of bytes currently allocated in this epoch.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

console.log("before", wgpu.frameArena.usedBytes());
wgpu.frameArena.alloc(2048, 16);
console.log("after", wgpu.frameArena.usedBytes());
```

## See Also
- [WasmGPU.frameArena.capBytes](./wasmgpu-framearena-capbytes.md)
- [WasmGPU.frameArena.reset](./wasmgpu-framearena-reset.md)
