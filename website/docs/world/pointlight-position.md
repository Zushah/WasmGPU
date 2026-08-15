# PointLight.position

## Summary
PointLight.position gets or sets the world-space origin of a point light. Move this value to track instruments, cursors, or animated emitters in scientific scenes. Position changes take effect on the next render/update.

## Syntax
```ts
PointLight.position: [number, number, number]
light.position = value;
const value = light.position;
```

## Parameters
This property does not take call parameters; assign a position vector to set it.

## Returns
`[number, number, number]` - Current world-space point light position.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const light = wgpu.createLight.point({ position: [0, 1, 0], range: 12 });
light.position = [1.5, 2.0, -0.5];
console.log(light.position);
```

## See Also
- [WasmGPU.createLight.point](./wasmgpu-createlight-point.md)
- [PointLight.range](./pointlight-range.md)
- [Scene.addLight](./scene-addlight.md)
