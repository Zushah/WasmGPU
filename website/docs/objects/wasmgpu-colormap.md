# WasmGPU.colormap

## Summary
WasmGPU.colormap is the colormap factory facade. It creates built-in or caller-defined color lookup tables for data-driven materials and scientific scene objects, with CPU sampling available when the created colormap retains a CPU lookup table.

## Syntax
```ts
const colors = wgpu.colormap.viridis();
```

## Available APIs
- [colormap.builtin](./colormap-builtin.md) selects a named built-in colormap.
- [colormap.viridis](./colormap-viridis.md), [colormap.turbo](./colormap-turbo.md), and related shortcuts create common built-ins.
- [colormap.fromStops](./colormap-fromstops.md) and [colormap.fromPalette](./colormap-frompalette.md) create custom colormaps.
- [colormap#sampleCPU](./colormap-samplecpu.md) samples a returned colormap when CPU data is available.

## See Also
- [WasmGPU.material](./wasmgpu-material.md)
- [material.data#colormap](./material-data-colormap.md)
- [createPointCloud#colormap](./createpointcloud-colormap.md)
