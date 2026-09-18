# createLight.point#range

## Summary
createLight.point#range gets or sets the light attenuation range used by point-light shading. Supply a finite, nonnegative distance. A positive range fades the light to zero at that distance; `0` leaves inverse-square attenuation without a finite cutoff. Larger ranges affect more of the scene but can flatten local contrast if intensity is not adjusted.

## Syntax
```ts
PointLight.range: number
light.range = value;
const value = light.range;
```

## Parameters
This property does not take call parameters; assign a numeric range to set it.

## Returns
`number` - Current attenuation range for the point light.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const light = wgpu.createLight.point({ intensity: 1.5, range: 8 });
light.range = 20;
console.log(light.range);
```

## See Also
- [createLight.point](./createlight-point.md)
- [createLight.point#position](./createlight-point-position.md)
- [createScene#getLightingData](./createscene-getlightingdata.md)
