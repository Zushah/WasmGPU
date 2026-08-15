# DirectionalLight.direction

## Summary
DirectionalLight.direction gets or sets the light direction vector. Setting this property normalizes non-zero input automatically, so direction length does not affect intensity. Update this value to rotate key/fill lighting without recreating the light.

## Syntax
```ts
DirectionalLight.direction: [number, number, number]
light.direction = value;
const value = light.direction;
```

## Parameters
This property does not take call parameters; assign a direction vector to set it.

## Returns
`[number, number, number]` - Normalized world-space light direction.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const light = wgpu.createLight.directional({ direction: [0, -1, 0] });
light.direction = [0.5, -1.0, 0.25];
console.log(light.direction);
```

## See Also
- [WasmGPU.createLight.directional](./wasmgpu-createlight-directional.md)
- [Scene.addLight](./scene-addlight.md)
- [Scene.getLightingData](./scene-getlightingdata.md)
