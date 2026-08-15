# Colormap.toUniformStops

## Summary
Colormap.toUniformStops operates on a Colormap runtime object to update state, query data, or manage lifecycle.

## Syntax
```ts
Colormap.toUniformStops(maxStops: number = 8, colorSpace: "srgb" | "linear" = "linear"): Color4[]
const result = colormap.toUniformStops(maxStops, colorSpace);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `maxStops` | `number = 8` | Yes | Maximum stop count for uniform-friendly color arrays. |
| `colorSpace` | `"srgb" \| "linear" = "linear"` | Yes | Color-space mode used by this conversion or lookup. |

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
- [Colormap.canSampleCPU](./colormap-cansamplecpu.md)
- [Colormap.filter](./colormap-filter.md)
- [Colormap.getGPUResources](./colormap-getgpuresources.md)
- [Colormap.getRGBA8LinearLUT](./colormap-getrgba8linearlut.md)
- [Colormap.sampleCPU](./colormap-samplecpu.md)
- [Colormap.width](./colormap-width.md)
