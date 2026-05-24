# Scene.lights

## Summary
Scene.lights returns all light instances currently attached to the scene, including disabled lights. Use this collection for inspection, UI listing, or bulk parameter edits.

## Syntax
```ts
Scene.lights: readonly Light[]
const lights = scene.lights;
```

## Parameters
This property does not take parameters.

## Returns
`readonly Light[]` - Ordered list of scene lights.

## Type Details
### LightType

```ts
type LightType = "ambient" | "directional" | "point" | "spot";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
scene.addLight(wgpu.createLight.ambient({ intensity: 0.2 }));
scene.addLight(wgpu.createLight.point({ position: [1, 2, 1], range: 10 }));
scene.addLight(wgpu.createLight.spot({ position: [-1, 2, 0], direction: [0, -1, 0], range: 14 }));
console.log(scene.lights.length, scene.lights.map(l => l.type));
```

## See Also
- [Scene.enabledLights](./wasmgpu-world-scene-enabledlights.md)
- [Scene.addLight](./wasmgpu-world-scene-addlight.md)
- [Scene.removeLight](./wasmgpu-world-scene-removelight.md)
- [Scene.getLightingData](./wasmgpu-world-scene-getlightingdata.md)
- [WasmGPU.createLight.spot](./wasmgpu-createlight-spot.md)
