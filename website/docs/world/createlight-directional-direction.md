# createLight.directional#direction

## Summary
createLight.directional#direction gets or sets the world-space light direction. Property assignment normalizes a nonzero vector and maps a zero vector to `[0, -1, 0]`. When constructing a directional light, supply a normalized nonzero direction for consistent results.

## Syntax
```ts
DirectionalLight.direction: [number, number, number]
light.direction = value;
const value = light.direction;
```

## Parameters
This property does not take call parameters; assign a direction vector to set it.

## Returns
`[number, number, number]` - Current world-space light direction. Values assigned through this property are normalized.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const light = wgpu.createLight.directional({ direction: [0, -1, 0] });
light.direction = [0.5, -1.0, 0.25];
console.log(light.direction);
```

## See Also
- [createLight.directional](./createlight-directional.md)
- [createScene#addLight](./createscene-addlight.md)
- [createScene#getLightingData](./createscene-getlightingdata.md)
