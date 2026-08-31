# RenderEffects.shadows

## Summary
RenderEffects.shadows exposes the `ShadowSystem` that configures directional-light shadow maps. A mesh casts or receives a shadow only when its corresponding mesh flag is enabled and the light has been enabled in this system.

## Syntax
```ts
RenderEffects.shadows: ShadowSystem
const shadows = wgpu.effects.shadows;
```

## Parameters
This read-only accessor does not take parameters.

## Returns
`ShadowSystem` - The engine-owned directional shadow controller.

## Type Details
Each `WasmGPU` instance owns one `ShadowSystem`. It holds global shadow-map settings and per-`DirectionalLight` configurations, and the renderer consumes that state automatically. `WasmGPU.destroy()` destroys the subsystem; applications should not destroy engine-owned GPU resources independently.

## Example
```js
const sun = wgpu.createLight.directional({ direction: [-1, -2, -1] });
scene.addLight(sun);
wgpu.effects.shadows.enable(sun);
```

## See Also
- [ShadowSystem.revision](./shadowsystem-revision.md)
- [WasmGPU.effects](./wasmgpu-effects.md)
- [ShadowSystem.enable](./shadowsystem-enable.md)
- [ShadowSystem.mapSize](./shadowsystem-mapsize.md)
- [Mesh.castShadow](../objects/mesh-castshadow.md)
