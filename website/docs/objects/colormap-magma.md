# colormap.magma

## Summary
colormap.magma returns the shared built-in Magma colormap singleton. It is equivalent to `wgpu.colormap.builtin("magma")` and supports CPU and GPU sampling.

## Syntax
```ts
WasmGPU.colormap.magma(): Colormap
const result = wgpu.colormap.magma();
```

## Returns
`Colormap` - Immutable process-wide magma lookup-table singleton.

## See Also
- [colormap.builtin](./colormap-builtin.md)
- [colormap.fromPalette](./colormap-frompalette.md)
- [colormap.fromStops](./colormap-fromstops.md)
