# colormap#filter

## Summary
colormap#filter reports whether lookups use linear interpolation or nearest-sample selection. The same mode is used by `sampleCPU()` and by samplers created for GPU-backed resources.

## Syntax
```ts
Colormap.filter: ColormapFilter
const value = colormap.filter;
```

## Returns
`"linear" | "nearest"` - Lookup interpolation mode.

## Type Details
### ColormapFilter

```ts
type ColormapFilter = "linear" | "nearest";
```

## See Also
- [colormap#canSampleCPU](./colormap-cansamplecpu.md)
- [colormap#getGPUResources](./colormap-getgpuresources.md)
- [colormap#sampleCPU](./colormap-samplecpu.md)
