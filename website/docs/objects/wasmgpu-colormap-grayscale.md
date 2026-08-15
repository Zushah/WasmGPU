# WasmGPU.colormap.grayscale

## Summary
WasmGPU.colormap.grayscale creates or retrieves a colormap definition used for scalar-to-color mapping.

## Syntax
```ts
WasmGPU.colormap.grayscale(): Colormap
const result = wgpu.colormap.grayscale();
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

const result = wgpu.colormap.grayscale();
console.log(result);
console.log(result.sampleCPU(0.5));
```

## See Also
- [WasmGPU.colormap.builtin](./wasmgpu-colormap-builtin.md)
- [WasmGPU.colormap.fromPalette](./wasmgpu-colormap-frompalette.md)
- [WasmGPU.colormap.fromStops](./wasmgpu-colormap-fromstops.md)
- [WasmGPU.colormap.inferno](./wasmgpu-colormap-inferno.md)
- [WasmGPU.colormap.magma](./wasmgpu-colormap-magma.md)
- [WasmGPU.colormap.plasma](./wasmgpu-colormap-plasma.md)
- [WasmGPU.colormap.turbo](./wasmgpu-colormap-turbo.md)
- [WasmGPU.colormap.viridis](./wasmgpu-colormap-viridis.md)
