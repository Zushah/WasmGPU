# WasmGPU.colormap.builtin

## Summary
WasmGPU.colormap.builtin creates or retrieves a colormap definition used for scalar-to-color mapping.

## Syntax
```ts
WasmGPU.colormap.builtin(name: BuiltinColormapName): Colormap
const result = wgpu.colormap.builtin(name);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `BuiltinColormapName` | Yes | Human-readable identifier used for labels, debugging, or lookup keys. |

## Returns
`Colormap` - Colormap runtime object for scalar-to-color mapping on CPU and GPU paths.

## Type Details
### BuiltinColormapName

```ts
type BuiltinColormapName = "grayscale" | "turbo" | "viridis" | "magma" | "plasma" | "inferno";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const name = "viridis";
const result = wgpu.colormap.builtin(name);
console.log(result);
console.log(result.sampleCPU(0.5));
```

## See Also
- [WasmGPU.colormap.fromPalette](./wasmgpu-colormap-frompalette.md)
- [WasmGPU.colormap.fromStops](./wasmgpu-colormap-fromstops.md)
- [WasmGPU.colormap.grayscale](./wasmgpu-colormap-grayscale.md)
- [WasmGPU.colormap.inferno](./wasmgpu-colormap-inferno.md)
- [WasmGPU.colormap.magma](./wasmgpu-colormap-magma.md)
- [WasmGPU.colormap.plasma](./wasmgpu-colormap-plasma.md)
- [WasmGPU.colormap.turbo](./wasmgpu-colormap-turbo.md)
- [WasmGPU.colormap.viridis](./wasmgpu-colormap-viridis.md)
