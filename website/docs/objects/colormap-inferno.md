# colormap.inferno

## Summary
colormap.inferno returns the shared built-in Inferno colormap singleton. It is equivalent to `wgpu.colormap.builtin("inferno")` and supports CPU and GPU sampling.

## Syntax
```ts
WasmGPU.colormap.inferno(): Colormap
const result = wgpu.colormap.inferno();
```

## Returns
`Colormap` - Immutable process-wide inferno lookup-table singleton.

## See Also
- [colormap.builtin](./colormap-builtin.md)
- [colormap.fromPalette](./colormap-frompalette.md)
- [colormap.fromStops](./colormap-fromstops.md)
