# colormap#sampleCPU

## Summary
colormap#sampleCPU samples the retained linear RGBA8 lookup table using the colormap's `nearest` or `linear` filter. The sampling helpers clamp the coordinate to the lookup-table endpoints. The method throws when `canSampleCPU` is `false`.

## Syntax
```ts
Colormap.sampleCPU(t: number): Color4
const result = colormap.sampleCPU(t);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `t` | `number` | Yes | Normalized sample coordinate, usually in `[0, 1]`. |

## Returns
`Color4` - Linear RGBA channels normalized to `[0, 1]`.

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
const t = 0.5;
const result = colormap.sampleCPU(t);
console.log(result);
```

## See Also
- [colormap#canSampleCPU](./colormap-cansamplecpu.md)
- [colormap#filter](./colormap-filter.md)
- [colormap#getGPUResources](./colormap-getgpuresources.md)
- [colormap#getRGBA8LinearLUT](./colormap-getrgba8linearlut.md)
- [colormap#toUniformStops](./colormap-touniformstops.md)
- [colormap#width](./colormap-width.md)
