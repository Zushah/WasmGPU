# PointLight.range

## Summary
PointLight.range gets or sets the light attenuation range used by point-light shading. Larger ranges affect more of the scene but can flatten local contrast if intensity is not adjusted. Tune range with intensity for stable, interpretable illumination.

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

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const light = wgpu.createLight.point({ intensity: 1.5, range: 8 });
light.range = 20;
console.log(light.range);
```

## See Also
- [WasmGPU.createLight.point](./wasmgpu-createlight-point.md)
- [PointLight.position](./pointlight-position.md)
- [Scene.getLightingData](./scene-getlightingdata.md)
