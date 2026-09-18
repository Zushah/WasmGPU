# colormap.grayscale

## Summary
colormap.grayscale returns the shared built-in grayscale colormap singleton. It is equivalent to `wgpu.colormap.builtin("grayscale")` and supports CPU and GPU sampling.

## Syntax
```ts
WasmGPU.colormap.grayscale(): Colormap
const result = wgpu.colormap.grayscale();
```

## Returns
`Colormap` - Immutable process-wide grayscale lookup-table singleton.

## See Also
- [colormap.builtin](./colormap-builtin.md)
- [colormap.fromPalette](./colormap-frompalette.md)
- [colormap.fromStops](./colormap-fromstops.md)
