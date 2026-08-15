# Colormap.sampleCPU

## Summary
Colormap.sampleCPU operates on a Colormap runtime object to update state, query data, or manage lifecycle.

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
`Color4` - Result produced by this API call as `Color4`.

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
- [Colormap.canSampleCPU](./colormap-cansamplecpu.md)
- [Colormap.filter](./colormap-filter.md)
- [Colormap.getGPUResources](./colormap-getgpuresources.md)
- [Colormap.getRGBA8LinearLUT](./colormap-getrgba8linearlut.md)
- [Colormap.toUniformStops](./colormap-touniformstops.md)
- [Colormap.width](./colormap-width.md)
