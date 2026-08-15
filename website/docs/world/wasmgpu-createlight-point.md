# WasmGPU.createLight.point

## Summary
WasmGPU.createLight.point creates a `PointLight` with local position and range controls. Point lights are useful for probes, local highlights, and instrument-like emitters. Combine position, intensity, and range to shape localized illumination without flattening global contrast.

## Syntax
```ts
WasmGPU.createLight.point(options?: PointLightOptions): PointLight
const light = wgpu.createLight.point(options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `PointLightOptions` | No | Optional point-source position/color/intensity/range configuration. |

## Returns
`PointLight` - Point light object ready for `scene.addLight(light)`.

## Type Details
### Color

```ts
type Color = [number, number, number];
```

### PointLightOptions

```ts
type PointLightOptions = {
    position?: [number, number, number];
    color?: Color;
    intensity?: number;
    range?: number;
};
```

#### PointLightOptions Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `position` | `[number, number, number]` | No | World-space source position; default `[0, 0, 0]`. |
| `color` | `Color` | No | Normalized RGB light color; default `[1, 1, 1]`. |
| `intensity` | `number` | No | Brightness multiplier; default `1`. |
| `range` | `number` | No | Effective attenuation distance; default `10`. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const probeLight = wgpu.createLight.point({
    position: [2, 1.5, -0.5],
    color: [0.8, 0.95, 1.0],
    intensity: 2.2,
    range: 18
});
scene.addLight(probeLight);
```

## See Also
- [WasmGPU.createLight.ambient](./wasmgpu-createlight-ambient.md)
- [WasmGPU.createLight.directional](./wasmgpu-createlight-directional.md)
- [WasmGPU.createLight.spot](./wasmgpu-createlight-spot.md)
- [PointLight.position](./pointlight-position.md)
- [PointLight.range](./pointlight-range.md)
- [Scene.addLight](./scene-addlight.md)
