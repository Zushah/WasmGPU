# WasmGPU.colormap.fromStops

## Summary
WasmGPU.colormap.fromStops creates or retrieves a colormap definition used for scalar-to-color mapping.

## Syntax
```ts
WasmGPU.colormap.fromStops(stops: ReadonlyArray<ColormapStop>, desc: ColormapDescriptor = {}): Colormap
const result = wgpu.colormap.fromStops(stops, desc);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `stops` | `ReadonlyArray<ColormapStop>` | Yes | Colormap stops used to generate a sampled LUT. |
| `desc` | `ColormapDescriptor = {}` | Yes | Descriptor object that controls colormap resolution/filter/color space. |

## Returns
`Colormap` - Colormap runtime object for scalar-to-color mapping on CPU and GPU paths.

## Type Details
### ColormapStop

```ts
type ColormapStop = Color4 | { t: number; color: Color4; };
```

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

### Color4

```ts
type Color4 = [number, number, number, number];
```

### ColormapFilter

```ts
type ColormapFilter = "linear" | "nearest";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const stops = [{ t: 0, color: [0, 0, 0, 1] }, { t: 1, color: [1, 1, 1, 1] }];
const desc = { resolution: 256, filter: "linear", colorSpace: "srgb" };
const result = wgpu.colormap.fromStops(stops, desc);
console.log(result);
console.log(result.sampleCPU(0.5));
```

## See Also
- [WasmGPU.colormap.builtin](./wasmgpu-colormap-builtin.md)
- [WasmGPU.colormap.fromPalette](./wasmgpu-colormap-frompalette.md)
- [WasmGPU.colormap.grayscale](./wasmgpu-colormap-grayscale.md)
- [WasmGPU.colormap.inferno](./wasmgpu-colormap-inferno.md)
- [WasmGPU.colormap.magma](./wasmgpu-colormap-magma.md)
- [WasmGPU.colormap.plasma](./wasmgpu-colormap-plasma.md)
- [WasmGPU.colormap.turbo](./wasmgpu-colormap-turbo.md)
- [WasmGPU.colormap.viridis](./wasmgpu-colormap-viridis.md)
