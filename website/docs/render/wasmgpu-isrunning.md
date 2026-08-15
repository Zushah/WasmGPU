# WasmGPU.isRunning

## Summary
WasmGPU.isRunning reports whether the RAF loop started by `WasmGPU.run` is currently active.
It is useful for guarding start/stop transitions and UI state.
This accessor is read-only and does not change engine state.

## Syntax
```ts
WasmGPU.isRunning: boolean
const active = wgpu.isRunning;
```

## Parameters
This API does not take parameters.

## Returns
`boolean` - `true` while the engine loop is active, otherwise `false`.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
console.log(wgpu.isRunning);
wgpu.run(() => {});
console.log(wgpu.isRunning);
wgpu.stop();
```

## See Also
- [WasmGPU.run](./wasmgpu-run.md)
- [WasmGPU.stop](./wasmgpu-stop.md)
- [WasmGPU.destroy](./wasmgpu-destroy.md)
