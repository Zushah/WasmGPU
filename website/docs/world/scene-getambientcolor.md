# Scene.getAmbientColor

## Summary
Scene.getAmbientColor computes the ambient RGB contribution from the first enabled ambient light, multiplying color by intensity. If no enabled ambient light exists, the method returns black `[0, 0, 0]`. Use this for diagnostics and custom shading paths.

## Syntax
```ts
Scene.getAmbientColor(): Color
const ambient = scene.getAmbientColor();
```

## Parameters
This method does not take parameters.

## Returns
`Color` - Effective ambient RGB color used by scene lighting extraction.

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
scene.addLight(wgpu.createLight.ambient({ color: [0.8, 0.9, 1.0], intensity: 0.2 }));
const ambient = scene.getAmbientColor();
console.log(ambient);
```

## See Also
- [Scene.getLightingData](./scene-getlightingdata.md)
- [Scene.addLight](./scene-addlight.md)
- [Scene.enabledLights](./scene-enabledlights.md)
