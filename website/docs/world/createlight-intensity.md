# createLight#intensity

## Summary
createLight#intensity gets or sets the scalar brightness multiplier for all light types. Supply a finite, nonnegative value. It scales the effect of light color without changing hue; `0` disables the light's contribution without changing `enabled`.

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

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const light = wgpu.createLight.point({ range: 12 });
light.intensity = 1.8;
console.log(light.intensity);
```

## See Also
- [createLight#color](./createlight-color.md)
- [createLight#enabled](./createlight-enabled.md)
- [createScene#getLightingData](./createscene-getlightingdata.md)
