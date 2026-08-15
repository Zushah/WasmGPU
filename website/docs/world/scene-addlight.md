# Scene.addLight

## Summary
Scene.addLight appends a light instance to the scene lighting list when not already present. Non-ambient lights beyond `Scene.MAX_LIGHTS` trigger a warning and may be ignored by lighting extraction paths. Use this method for ambient, directional, point, and spot lights.

## Syntax
```ts
Scene.addLight(light: Light): Scene
const result = scene.addLight(light);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `light` | `Light` | Yes | Ambient, directional, point, or spot light instance to register with the scene. |

## Returns
`Scene` - The same scene instance after light registration.

## Type Details
### LightType

```ts
type LightType = "ambient" | "directional" | "point" | "spot";
```

### Light

```ts
type Light = {
    readonly type: LightType;
    color: [number, number, number];
    intensity: number;
    enabled: boolean;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
scene.addLight(wgpu.createLight.ambient({ intensity: 0.15 }));
scene.addLight(wgpu.createLight.directional({ direction: [0.2, -1, 0.3], intensity: 1.1 }));
scene.addLight(wgpu.createLight.spot({ position: [1, 2, 0], direction: [0, -1, 0], range: 12 }));
```

## See Also
- [Scene.removeLight](./scene-removelight.md)
- [Scene.clearLights](./scene-clearlights.md)
- [Scene.lights](./scene-lights.md)
- [Scene.enabledLights](./scene-enabledlights.md)
- [WasmGPU.createLight.spot](./wasmgpu-createlight-spot.md)
