# colormap.viridis

## Summary
colormap.viridis returns the shared built-in Viridis colormap singleton. It is equivalent to `wgpu.colormap.builtin("viridis")` and supports CPU and GPU sampling.

## Syntax
```ts
WasmGPU.colormap.viridis(): Colormap
const result = wgpu.colormap.viridis();
```

## Returns
`Colormap` - Immutable process-wide viridis lookup-table singleton.

## See Also
- [colormap.builtin](./colormap-builtin.md)
- [colormap.fromPalette](./colormap-frompalette.md)
- [colormap.fromStops](./colormap-fromstops.md)
