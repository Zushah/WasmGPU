# createLight#enabled

## Summary
createLight#enabled gets or sets whether a light participates in lighting calculations. Disabled lights remain in `scene.lights` but are excluded from `scene.enabledLights` and extracted lighting data.

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

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const light = wgpu.createLight.directional({ intensity: 1.2 });
light.enabled = false;
console.log(light.enabled);
```

## See Also
- [createLight#type](./createlight-type.md)
- [createScene#enabledLights](./createscene-enabledlights.md)
- [createScene#getLightingData](./createscene-getlightingdata.md)
