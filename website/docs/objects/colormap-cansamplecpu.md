# colormap#canSampleCPU

## Summary
colormap#canSampleCPU is `true` when the colormap retains a CPU-side linear RGBA8 lookup table. It is `false` for colormaps created from an external GPU texture view; in that case `sampleCPU()` and `getRGBA8LinearLUT()` throw.

## Syntax
```ts
Colormap.canSampleCPU: boolean
const value = colormap.canSampleCPU;
```

## Returns
`boolean` - Whether CPU lookup-table access and sampling are available.

## See Also
- [colormap#filter](./colormap-filter.md)
- [colormap#getGPUResources](./colormap-getgpuresources.md)
- [colormap#getRGBA8LinearLUT](./colormap-getrgba8linearlut.md)
- [colormap#sampleCPU](./colormap-samplecpu.md)
- [colormap#toUniformStops](./colormap-touniformstops.md)
- [colormap#width](./colormap-width.md)
