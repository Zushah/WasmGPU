# colormap#toUniformStops

## Summary
colormap#toUniformStops produces evenly spaced nearest lookup-table samples for compact uniform arrays. The requested count is floored and clamped to `2..8`; output defaults to linear space and can be converted to sRGB. GPU-only colormaps return a two-stop black-to-white fallback.

## Syntax
```ts
Colormap.toUniformStops(maxStops: number = 8, colorSpace: "srgb" | "linear" = "linear"): Color4[]
const result = colormap.toUniformStops(maxStops, colorSpace);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `maxStops` | `number` | No | Requested stop count; default `8`, floored and clamped to `2..8`. |
| `colorSpace` | `"srgb" \| "linear"` | No | Output RGB color space; default `"linear"`. Alpha is unchanged. |

## Returns
`Color4[]` - Result produced by this API call as `Color4[]`.

## Type Details
### Color4

```ts
type Color4 = [number, number, number, number];
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const colormap = wgpu.colormap.viridis();
const maxStops = 8;
const colorSpace = "linear";
const result = colormap.toUniformStops(maxStops, colorSpace);
console.log(result);
```

## See Also
- [colormap#canSampleCPU](./colormap-cansamplecpu.md)
- [colormap#filter](./colormap-filter.md)
- [colormap#getGPUResources](./colormap-getgpuresources.md)
- [colormap#getRGBA8LinearLUT](./colormap-getrgba8linearlut.md)
- [colormap#sampleCPU](./colormap-samplecpu.md)
- [colormap#width](./colormap-width.md)
