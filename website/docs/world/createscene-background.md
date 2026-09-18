# createScene#background

## Summary
createScene#background gets or sets the scene clear color used before rendering objects. Supply three finite RGB components in `[0, 1]`. The getter returns the current `Color` tuple.

## Syntax
```ts
Scene.background: Color
scene.background = value;
const value = scene.background;
```

## Parameters
This property does not take call parameters; assign a `Color` to update it.

## Returns
`Color` - Current scene clear color as `[r, g, b]`.

## Type Details
### Color

```ts
type Color = [number, number, number];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
scene.background = [0.02, 0.04, 0.08];
console.log(scene.background);
```

## See Also
- [WasmGPU.createScene](./wasmgpu-createscene.md)
- [createScene#getAmbientColor](./createscene-getambientcolor.md)
- [createScene#getLightingData](./createscene-getlightingdata.md)
