# createLight#color

## Summary
createLight#color gets or sets the RGB color for any light type (`ambient`, `directional`, `point`, or `spot`). Supply three finite, nonnegative components; values above `1` can represent high-intensity colors. The color is multiplied by `intensity` during lighting evaluation.

## Syntax
```ts
Light.color: [number, number, number]
light.color = value;
const value = light.color;
```

## Parameters
This property does not take call parameters; assign an RGB tuple to set it.

## Returns
`[number, number, number]` - Current RGB light color.

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
- [createLight#intensity](./createlight-intensity.md)
- [createLight#enabled](./createlight-enabled.md)
- [createScene#addLight](./createscene-addlight.md)
