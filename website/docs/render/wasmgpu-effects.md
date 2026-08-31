# WasmGPU.effects

## Summary
WasmGPU.effects exposes render-effect configuration owned by this engine instance. In v0.10.0, its public subsystem is directional shadow mapping.

## Syntax
```ts
WasmGPU.effects: RenderEffects
const effects = wgpu.effects;
```

## Parameters
This read-only accessor does not take parameters.

## Returns
`RenderEffects` - The instance-bound effects facade. It is created with the engine and destroyed by `WasmGPU.destroy()`.

## Type Details
```ts
type RenderEffects = {
    readonly shadows: ShadowSystem;
};
```

The facade and its `ShadowSystem` are owned by the engine. Configure them in place; the accessor always returns the same effects instance for that `WasmGPU` engine.

## Example
```js
const wgpu = await WasmGPU.create(document.querySelector("canvas"));
wgpu.effects.shadows.mapSize = 2048;
```

## See Also
- [RenderEffects.shadows](./rendereffects-shadows.md)
- [ShadowSystem.enable](./shadowsystem-enable.md)
- [WasmGPU.destroy](./wasmgpu-destroy.md)
