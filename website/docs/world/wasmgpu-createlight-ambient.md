# WasmGPU.createLight.ambient

## Summary
WasmGPU.createLight.ambient creates an `AmbientLight` that adds uniform scene-wide baseline illumination. Ambient light does not have direction or position and is multiplied into all lit shading paths. Keep intensity moderate so directional/point lights still define shape.

## Syntax
```ts
WasmGPU.createLight.ambient(options?: AmbientLightOptions): AmbientLight
const ambient = wgpu.createLight.ambient(options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `AmbientLightOptions` | No | Optional color and intensity for the ambient term. |

## Returns
`AmbientLight` - Ambient light object for `scene.addLight(...)`.

## Type Details
### Color

```ts
type Color = [number, number, number];
```

### AmbientLightOptions

```ts
type AmbientLightOptions = {
    color?: Color;
    intensity?: number;
};
```

#### AmbientLightOptions Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `color` | `Color` | No | Normalized RGB tint; default `[1, 1, 1]`. |
| `intensity` | `number` | No | Ambient multiplier; default `0.1`. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene([0.03, 0.03, 0.04]);
const ambient = wgpu.createLight.ambient({
    color: [0.85, 0.9, 1.0],
    intensity: 0.2
});
scene.addLight(ambient);
```

## See Also
- [WasmGPU.createLight.directional](./wasmgpu-createlight-directional.md)
- [WasmGPU.createLight.point](./wasmgpu-createlight-point.md)
- [WasmGPU.createLight.spot](./wasmgpu-createlight-spot.md)
- [Scene.addLight](./scene-addlight.md)
- [Scene.getAmbientColor](./scene-getambientcolor.md)
