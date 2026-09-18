# colormap.plasma

## Summary
colormap.plasma returns the shared built-in Plasma colormap singleton. It is equivalent to `wgpu.colormap.builtin("plasma")` and supports CPU and GPU sampling.

## Syntax
```ts
WasmGPU.colormap.plasma(): Colormap
const result = wgpu.colormap.plasma();
```

## Returns
`Colormap` - Immutable process-wide plasma lookup-table singleton.

## See Also
- [colormap.builtin](./colormap-builtin.md)
- [colormap.fromPalette](./colormap-frompalette.md)
- [colormap.fromStops](./colormap-fromstops.md)
