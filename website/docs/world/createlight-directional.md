# createLight.directional

## Summary
createLight.directional creates a `DirectionalLight` for distant, parallel light sources such as sun/sky approximations. Supply a normalized nonzero `direction`; later property assignments are normalized by `DirectionalLight.direction`.

## Syntax
```ts
WasmGPU.createLight.directional(options?: DirectionalLightOptions): DirectionalLight
const light = wgpu.createLight.directional(options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `DirectionalLightOptions` | No | Optional direction/color/intensity values for the light. |

## Returns
`DirectionalLight` - Directional light object for scene lighting.

## Type Details
### Color

```ts
type Color = [number, number, number];
```

### DirectionalLightOptions

```ts
type DirectionalLightOptions = {
    direction?: [number, number, number];
    color?: Color;
    intensity?: number;
};
```

#### DirectionalLightOptions Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `direction` | `[number, number, number]` | No | Finite, normalized, nonzero world-space light direction; default `[0, -1, 0]`. |
| `color` | `Color` | No | Three finite, nonnegative RGB components; default `[1, 1, 1]`. Components above `1` are supported. |
| `intensity` | `number` | No | Finite nonnegative brightness multiplier; default `1`. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const key = wgpu.createLight.directional({
    direction: [0.408248, -0.816497, 0.408248],
    color: [1.0, 0.97, 0.92],
    intensity: 1.4
});
scene.addLight(key);
```

## See Also
- [createLight.ambient](./createlight-ambient.md)
- [createLight.point](./createlight-point.md)
- [createLight.spot](./createlight-spot.md)
- [createLight.directional#direction](./createlight-directional-direction.md)
- [createScene#addLight](./createscene-addlight.md)
