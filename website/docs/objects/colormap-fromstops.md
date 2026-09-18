# colormap.fromStops

## Summary
colormap.fromStops creates a new evenly sampled lookup table from at least two RGBA stops. Bare colors receive evenly spaced positions; explicit positions are clamped to `[0, 1]` and sorted. Resolution defaults to the built-in resolution and is floored and clamped to at least `2`; filtering defaults to `"linear"` and input RGB to sRGB.

## Syntax
```ts
WasmGPU.colormap.fromStops(stops: ReadonlyArray<ColormapStop>, desc: ColormapDescriptor = {}): Colormap
const result = wgpu.colormap.fromStops(stops, desc);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `stops` | `ReadonlyArray<ColormapStop>` | Yes | Colormap stops used to generate a sampled LUT. |
| `desc` | `ColormapDescriptor` | No | Optional resolution, filtering, and input color-space controls. |

## Returns
`Colormap` - Immutable colormap backed by normalized copies of the supplied stops.

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
| `resolution` | `number` | No | Lookup-table sample count; floored and clamped to at least `2`. |
| `filter` | `ColormapFilter` | No | Lookup filtering; default `"linear"`. |
| `colorSpace` | `"srgb" \| "linear"` | No | Input RGB interpretation; default `"srgb"`. |

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
console.log(result.sampleCPU(0.5));
```

## See Also
- [colormap.builtin](./colormap-builtin.md)
- [colormap.fromPalette](./colormap-frompalette.md)
- [colormap.grayscale](./colormap-grayscale.md)
- [colormap.inferno](./colormap-inferno.md)
- [colormap.magma](./colormap-magma.md)
- [colormap.plasma](./colormap-plasma.md)
- [colormap.turbo](./colormap-turbo.md)
- [colormap.viridis](./colormap-viridis.md)
