# Light.enabled

## Summary
Light.enabled gets or sets whether a light participates in lighting calculations. Disabled lights remain in `scene.lights` but are excluded from `scene.enabledLights` and extracted lighting data.

## Syntax
```ts
Light.enabled: boolean
light.enabled = value;
const value = light.enabled;
```

## Parameters
This property does not take call parameters; assign `true` or `false` to set it.

## Returns
`boolean` - Whether the light is currently active.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const light = wgpu.createLight.directional({ intensity: 1.2 });
light.enabled = false;
console.log(light.enabled);
```

## See Also
- [Light.type](./light-type.md)
- [Scene.enabledLights](./scene-enabledlights.md)
- [Scene.getLightingData](./scene-getlightingdata.md)
