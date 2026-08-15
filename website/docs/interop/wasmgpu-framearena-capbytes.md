# WasmGPU.frameArena.capBytes

## Summary
WasmGPU.frameArena.capBytes returns the total capacity of the global frame arena in bytes.
Compare this with `usedBytes()` to monitor headroom.

## Syntax
```ts
WasmGPU.frameArena.capBytes(): number
const capacity = wgpu.frameArena.capBytes();
```

## Parameters
This API does not take parameters.

## Returns
`number` - Total arena capacity in bytes.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const cap = wgpu.frameArena.capBytes();
const used = wgpu.frameArena.usedBytes();
console.log({ used, cap, pct: used / Math.max(1, cap) });
```

## See Also
- [WasmGPU.frameArena.usedBytes](./wasmgpu-framearena-usedbytes.md)
- [WasmGPU.frameArena.init](./wasmgpu-framearena-init.md)
