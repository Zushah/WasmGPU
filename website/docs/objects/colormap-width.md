# colormap#width

## Summary
colormap#width is the number of RGBA samples in the one-dimensional lookup table. For palette colormaps it equals the palette length; for stop-based colormaps it is the requested resolution after clamping to at least two samples.

## Syntax
```ts
Colormap.width: number
const value = colormap.width;
```

## Returns
`number` - Lookup-table sample count.

## See Also
- [colormap#canSampleCPU](./colormap-cansamplecpu.md)
- [colormap#filter](./colormap-filter.md)
- [colormap#getGPUResources](./colormap-getgpuresources.md)
- [colormap#getRGBA8LinearLUT](./colormap-getrgba8linearlut.md)
- [colormap#sampleCPU](./colormap-samplecpu.md)
- [colormap#toUniformStops](./colormap-touniformstops.md)
