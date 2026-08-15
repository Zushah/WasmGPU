# Scene.enabledLights

## Summary
Scene.enabledLights returns only lights whose `enabled` flag is true. This filtered list matches what lighting extraction paths consider active before type-specific truncation. Use it for debugging why a light is not affecting rendering.

## Syntax
```ts
Scene.enabledLights: Light[]
const active = scene.enabledLights;
```

## Parameters
This property does not take parameters.

## Returns
`Light[]` - Active lights currently enabled in the scene.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const key = wgpu.createLight.directional({ intensity: 1.0 });
const fill = wgpu.createLight.point({ intensity: 0.8, range: 12 });
fill.enabled = false;
scene.addLight(key).addLight(fill);
console.log(scene.enabledLights.map(l => l.type));
```

## See Also
- [Scene.lights](./scene-lights.md)
- [Scene.getLightingData](./scene-getlightingdata.md)
- [Scene.addLight](./scene-addlight.md)
