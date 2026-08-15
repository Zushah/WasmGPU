# Light.intensity

## Summary
Light.intensity gets or sets the scalar brightness multiplier for all light types. It scales the effect of light color without changing hue. Tune this to balance multiple lights in the same scene.

## Syntax
```ts
Light.intensity: number
light.intensity = value;
const value = light.intensity;
```

## Parameters
This property does not take call parameters; assign a numeric value to set intensity.

## Returns
`number` - Current light intensity multiplier.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const light = wgpu.createLight.point({ range: 12 });
light.intensity = 1.8;
console.log(light.intensity);
```

## See Also
- [Light.color](./light-color.md)
- [Light.enabled](./light-enabled.md)
- [Scene.getLightingData](./scene-getlightingdata.md)
