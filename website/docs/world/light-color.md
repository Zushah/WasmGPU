# Light.color

## Summary
Light.color gets or sets the normalized RGB color for any light type (`ambient`, `directional`, `point`). This tint is multiplied by `intensity` during lighting evaluation. Use it to control spectral balance independently from brightness.

## Syntax
```ts
Light.color: [number, number, number]
light.color = value;
const value = light.color;
```

## Parameters
This property does not take call parameters; assign an RGB tuple to set it.

## Returns
`[number, number, number]` - Current normalized RGB light color.

## Type Details
```ts
type Color = [number, number, number];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const light = wgpu.createLight.directional();
light.color = [1.0, 0.95, 0.85];
console.log(light.color);
```

## See Also
- [Light.intensity](./light-intensity.md)
- [Light.enabled](./light-enabled.md)
- [Scene.addLight](./scene-addlight.md)
