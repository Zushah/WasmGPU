# WasmGPU.colormap.fromPalette

## Summary
WasmGPU.colormap.fromPalette creates or retrieves a colormap definition used for scalar-to-color mapping.

## Syntax
```ts
WasmGPU.colormap.fromPalette(colors: ReadonlyArray<[number, number, number, number]>, desc: ColormapDescriptor = {}): Colormap
const result = wgpu.colormap.fromPalette(colors, desc);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `colors` | `ReadonlyArray<[number, number, number, number]>` | Yes | Palette colors used to build a colormap. |
| `desc` | `ColormapDescriptor = {}` | Yes | Descriptor object that controls colormap resolution/filter/color space. |

## Returns
`Colormap` - Colormap runtime object for scalar-to-color mapping on CPU and GPU paths.

## Type Details
### ColormapDescriptor

```ts
type ColormapDescriptor = {

    resolution?: number;

    filter?: ColormapFilter;

    colorSpace?: "srgb" | "linear";

};
```

#### ColormapDescriptor Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `resolution` | `number` | No | Numeric input controlling `resolution` for this operation. |
| `filter` | `ColormapFilter` | No | Filtering mode used for colormap or sampler lookups. |
| `colorSpace` | `"srgb" \| "linear"` | No | Color-space mode used by this conversion or lookup. |

### ColormapFilter

```ts
type ColormapFilter = "linear" | "nearest";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const colors = [[0.1, 0.2, 0.8, 1], [0.9, 0.9, 0.2, 1]];
const desc = { resolution: 256, filter: "linear", colorSpace: "srgb" };
const result = wgpu.colormap.fromPalette(colors, desc);
console.log(result);
console.log(result.sampleCPU(0.5));
```

## See Also
- [WasmGPU.colormap.builtin](./wasmgpu-colormap-builtin.md)
- [WasmGPU.colormap.fromStops](./wasmgpu-colormap-fromstops.md)
- [WasmGPU.colormap.grayscale](./wasmgpu-colormap-grayscale.md)
- [WasmGPU.colormap.inferno](./wasmgpu-colormap-inferno.md)
- [WasmGPU.colormap.magma](./wasmgpu-colormap-magma.md)
- [WasmGPU.colormap.plasma](./wasmgpu-colormap-plasma.md)
- [WasmGPU.colormap.turbo](./wasmgpu-colormap-turbo.md)
- [WasmGPU.colormap.viridis](./wasmgpu-colormap-viridis.md)
