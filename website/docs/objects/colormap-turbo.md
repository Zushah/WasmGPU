# colormap.turbo

## Summary
colormap.turbo returns the shared built-in Turbo colormap singleton. It is equivalent to `wgpu.colormap.builtin("turbo")` and supports CPU and GPU sampling.

## Syntax
```ts
WasmGPU.colormap.turbo(): Colormap
const result = wgpu.colormap.turbo();
```

## Returns
`Colormap` - Immutable process-wide turbo lookup-table singleton.

## See Also
- [colormap.builtin](./colormap-builtin.md)
- [colormap.fromPalette](./colormap-frompalette.md)
- [colormap.fromStops](./colormap-fromstops.md)
