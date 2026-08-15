# Scene.clearLights

## Summary
Scene.clearLights removes all lights from the scene in one call. Object collections are unaffected. Use this to reset lighting presets while keeping scene geometry/data intact.

## Syntax
```ts
Scene.clearLights(): Scene
const result = scene.clearLights();
```

## Parameters
This method does not take parameters.

## Returns
`Scene` - The same scene instance with `lights` cleared.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
scene.addLight(wgpu.createLight.ambient({ intensity: 0.1 }));
scene.addLight(wgpu.createLight.directional({ intensity: 1.2 }));
scene.clearLights();
```

## See Also
- [Scene.addLight](./scene-addlight.md)
- [Scene.removeLight](./scene-removelight.md)
- [Scene.lights](./scene-lights.md)
- [Scene.enabledLights](./scene-enabledlights.md)
