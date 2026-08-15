# WasmGPU.colormap.inferno

## Summary
WasmGPU.colormap.inferno creates or retrieves a colormap definition used for scalar-to-color mapping.

## Syntax
```ts
WasmGPU.colormap.inferno(): Colormap
const result = wgpu.colormap.inferno();
```

## Parameters
This API does not take parameters.

## Returns
`Colormap` - Colormap runtime object for scalar-to-color mapping on CPU and GPU paths.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const result = wgpu.colormap.inferno();
console.log(result);
console.log(result.sampleCPU(0.5));
```

## See Also
- [WasmGPU.colormap.builtin](./wasmgpu-colormap-builtin.md)
- [WasmGPU.colormap.fromPalette](./wasmgpu-colormap-frompalette.md)
- [WasmGPU.colormap.fromStops](./wasmgpu-colormap-fromstops.md)
- [WasmGPU.colormap.grayscale](./wasmgpu-colormap-grayscale.md)
- [WasmGPU.colormap.magma](./wasmgpu-colormap-magma.md)
- [WasmGPU.colormap.plasma](./wasmgpu-colormap-plasma.md)
- [WasmGPU.colormap.turbo](./wasmgpu-colormap-turbo.md)
- [WasmGPU.colormap.viridis](./wasmgpu-colormap-viridis.md)
