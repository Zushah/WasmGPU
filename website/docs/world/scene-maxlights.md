# Scene.MAX_LIGHTS

## Summary
Scene.MAX_LIGHTS is the maximum number of non-ambient lights considered by scene lighting extraction. Extra non-ambient lights can still be stored but may be truncated in `getLightingData()`. Use this constant when designing lighting UIs and validation rules.

## Syntax
```ts
Scene.MAX_LIGHTS: number
const maxLights = scene.constructor.MAX_LIGHTS;
```

## Parameters
This static property does not take parameters.

## Returns
`number` - Maximum supported non-ambient light count for extraction/render paths.

## Type Details
```ts
// Static numeric constant.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const maxLights = scene.constructor.MAX_LIGHTS;
for (let i = 0; i < maxLights + 2; i++) {
    scene.addLight(wgpu.createLight.point({ position: [i, 2, 0], intensity: 0.5, range: 8 }));
}
console.log(maxLights, scene.getLightingData().lights.length);
```

## See Also
- [Scene.addLight](./scene-addlight.md)
- [Scene.getLightingData](./scene-getlightingdata.md)
- [Scene.enabledLights](./scene-enabledlights.md)
