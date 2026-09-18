# frameArena.epoch

## Summary
frameArena.epoch returns the current frame-arena generation counter.
The epoch increments after `init()` and `reset()`.
Frame `WasmSlice` objects created through `wgpu.driver.frame.alloc*()` use this value to detect stale access after reset.

## Syntax
```ts
WasmGPU.frameArena.epoch(): number
const epoch = wgpu.frameArena.epoch();
```

## Parameters
This API does not take parameters.

## Returns
`number` - Current frame arena epoch.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const e0 = wgpu.frameArena.epoch();
wgpu.frameArena.reset();
const e1 = wgpu.frameArena.epoch();
console.log(e0, e1);
```

## See Also
- [frameArena.reset](./framearena-reset.md)
- [WasmGPU.driver](./wasmgpu-driver.md)
- [frameArena.allocF32](./framearena-allocf32.md)
