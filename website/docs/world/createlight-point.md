# createLight.point

## Summary
createLight.point creates a `PointLight` with local position and range controls. Point lights are useful for probes, local highlights, and instrument-like emitters. Combine position, intensity, and range to shape localized illumination without flattening global contrast.

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
| `position` | `[number, number, number]` | No | Finite world-space source position; default `[0, 0, 0]`. |
| `color` | `Color` | No | Three finite, nonnegative RGB components; default `[1, 1, 1]`. Components above `1` are supported. |
| `intensity` | `number` | No | Finite nonnegative brightness multiplier; default `1`. |
| `range` | `number` | No | Finite nonnegative attenuation distance; default `10`. A value of `0` selects no finite cutoff. |

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
- [createLight.ambient](./createlight-ambient.md)
- [createLight.directional](./createlight-directional.md)
- [createLight.spot](./createlight-spot.md)
- [createLight.point#position](./createlight-point-position.md)
- [createLight.point#range](./createlight-point-range.md)
- [createScene#addLight](./createscene-addlight.md)
