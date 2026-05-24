# Scene.getLightingData

## Summary
Scene.getLightingData returns lighting data split into ambient RGB and non-ambient active lights. The light list excludes ambient lights and is capped at `Scene.MAX_LIGHTS`. This is the canonical extraction path used by rendering code.

## Syntax
```ts
Scene.getLightingData(): { ambient: Color; lights: Light[] }
const data = scene.getLightingData();
```

## Parameters
This method does not take parameters.

## Returns
`{ ambient: Color; lights: Light[] }` - Ambient contribution plus active non-ambient light list.

## Type Details
### Color

```ts
type Color = [number, number, number];
```

### LightType

```ts
type LightType = "ambient" | "directional" | "point" | "spot";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
scene.addLight(wgpu.createLight.ambient({ intensity: 0.15 }));
scene.addLight(wgpu.createLight.directional({ direction: [0.3, -1, 0.2], intensity: 1.1 }));
scene.addLight(wgpu.createLight.spot({ position: [0, 2, 1], direction: [0, -1, -0.2], range: 10 }));

const lighting = scene.getLightingData();
console.log(lighting.ambient, lighting.lights.length);
```

## See Also
- [Scene.getAmbientColor](./wasmgpu-world-scene-getambientcolor.md)
- [Scene.enabledLights](./wasmgpu-world-scene-enabledlights.md)
- [Scene.addLight](./wasmgpu-world-scene-addlight.md)
