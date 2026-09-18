# createScene#clearLights

## Summary
createScene#clearLights removes all lights from the scene in one call. Object collections are unaffected. Use this to reset lighting presets while keeping scene geometry/data intact.

## Syntax
```ts
Scene.clearLights(): Scene
const result = scene.clearLights();
```

## Parameters
This method does not take parameters.

## Returns
`Scene` - The same scene instance with `lights` cleared.

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
- [createScene#addLight](./createscene-addlight.md)
- [createScene#removeLight](./createscene-removelight.md)
- [createScene#lights](./createscene-lights.md)
- [createScene#enabledLights](./createscene-enabledlights.md)
