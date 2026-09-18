# effects.shadows

## Summary
effects.shadows exposes the `ShadowSystem` that configures directional-light shadow maps. A visible mesh is included as a caster when `castShadow` is enabled. `receiveShadow` controls shadow sampling on supported `StandardMaterial` render paths; unlit and other unsupported materials do not receive directional shadows.

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

Enabling a light stores configuration but does not add it to a scene. A configured directional light receives a shadow-map layer only while it is present in the rendered scene and falls within `maxViews`.

## Example
```js
const sun = wgpu.createLight.directional({ direction: [-1, -2, -1] });
scene.addLight(sun);
wgpu.effects.shadows.enable(sun);
```

## See Also
- [effects.shadows.revision](./effects-shadows-revision.md)
- [WasmGPU.effects](./wasmgpu-effects.md)
- [effects.shadows.enable](./effects-shadows-enable.md)
- [effects.shadows.mapSize](./effects-shadows-mapsize.md)
- [createMesh#castShadow](../objects/createmesh-castshadow.md)
