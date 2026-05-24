# WasmGPU.createLight.spot

## Summary
WasmGPU.createLight.spot creates a `SpotLight` with position, direction, range, and cone-angle controls. Spot lights are useful for focused local illumination, inspection beams, and glTF punctual-light imports that need a bounded cone rather than omnidirectional falloff.

## Syntax
```ts
WasmGPU.createLight.spot(options?: SpotLightOptions): SpotLight
const light = wgpu.createLight.spot(options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `SpotLightOptions` | No | Optional position, direction, color, intensity, range, and cone-angle configuration. |

## Returns
`SpotLight` - Spot light object ready for `scene.addLight(light)`.

## Type Details
### Color

```ts
type Color = [number, number, number];
```

### SpotLightOptions

```ts
type SpotLightOptions = {
    position?: [number, number, number];
    direction?: [number, number, number];
    color?: Color;
    intensity?: number;
    range?: number;
    innerCone?: number;
    outerCone?: number;
};
```

#### SpotLightOptions Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `position` | `[number, number, number]` | No | World-space light origin; default `[0, 0, 0]`. |
| `direction` | `[number, number, number]` | No | World-space light direction; default `[0, -1, 0]` and normalized when set. |
| `color` | `Color` | No | Normalized RGB light color; default `[1, 1, 1]`. |
| `intensity` | `number` | No | Brightness multiplier; default `1`. |
| `range` | `number` | No | Effective attenuation distance; default `10`. |
| `innerCone` | `number` | No | Inner cone angle in radians. Values above `outerCone` clamp back down to `outerCone`. Default `Math.PI / 8`. |
| `outerCone` | `number` | No | Outer cone angle in radians. Default `Math.PI / 6`. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const keySpot = wgpu.createLight.spot({
    position: [1.5, 2.5, 1.0],
    direction: [-0.3, -1.0, -0.2],
    color: [1.0, 0.96, 0.88],
    intensity: 2.0,
    range: 20,
    innerCone: Math.PI / 10,
    outerCone: Math.PI / 6
});
scene.addLight(keySpot);
```

## See Also
- [WasmGPU.createLight.directional](./wasmgpu-createlight-directional.md)
- [WasmGPU.createLight.point](./wasmgpu-createlight-point.md)
- [Scene.addLight](./wasmgpu-world-scene-addlight.md)
- [Light.type](./wasmgpu-world-light-type.md)
