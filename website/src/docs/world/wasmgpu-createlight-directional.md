# WasmGPU.createLight.directional

## Summary
WasmGPU.createLight.directional creates a `DirectionalLight` for distant, parallel light sources such as sun/sky approximations. Direction vectors are normalized internally when set to non-zero values. Use one or two directional lights for stable, low-noise shading in scientific scenes.

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
| `direction` | `[number, number, number]` | No | World-space light direction; default `[0, -1, 0]` then normalized. |
| `color` | `Color` | No | Normalized RGB light color; default `[1, 1, 1]`. |
| `intensity` | `number` | No | Brightness multiplier; default `1`. |

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const key = wgpu.createLight.directional({
    direction: [0.4, -1, 0.2],
    color: [1.0, 0.97, 0.92],
    intensity: 1.4
});
scene.addLight(key);
```

## See Also
- [WasmGPU.createLight.ambient](./wasmgpu-createlight-ambient.md)
- [WasmGPU.createLight.point](./wasmgpu-createlight-point.md)
- [WasmGPU.createLight.spot](./wasmgpu-createlight-spot.md)
- [DirectionalLight.direction](./wasmgpu-world-directionallight-direction.md)
- [Scene.addLight](./wasmgpu-world-scene-addlight.md)
