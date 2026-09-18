# WasmGPU.createLight

## Summary
WasmGPU.createLight is the light factory facade. It creates ambient, directional, point, and spot lights for scene lighting; returned lights are plain scene resources and are not added to a scene automatically.

## Syntax
```ts
const sun = wgpu.createLight.directional({ direction: [-1, -2, -1] });
scene.addLight(sun);
```

## Available APIs
- [createLight.ambient](./createlight-ambient.md) creates ambient illumination.
- [createLight.directional](./createlight-directional.md) creates a directional light.
- [createLight.point](./createlight-point.md) and [createLight.spot](./createlight-spot.md) create local lights.
- [createLight#enabled](./createlight-enabled.md), [createLight#color](./createlight-color.md), and [createLight#intensity](./createlight-intensity.md) document shared light state.
- [createLight.directional#direction](./createlight-directional-direction.md) and [createLight.point#range](./createlight-point-range.md) document type-specific state.

## See Also
- [WasmGPU.createScene](./wasmgpu-createscene.md)
- [createScene#addLight](./createscene-addlight.md)
- [effects.shadows.enable](../render/effects-shadows-enable.md)
