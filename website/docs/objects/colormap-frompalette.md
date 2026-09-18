# colormap.fromPalette

## Summary
colormap.fromPalette creates a new lookup table with one sample per supplied RGBA color. At least one color is required. Input RGB values default to sRGB conversion into the stored linear RGBA8 table, and filtering defaults to `"nearest"`. The shared `resolution` option currently has no supported effect for palettes; output width is always `colors.length`.

## Syntax
```ts
WasmGPU.colormap.fromPalette(colors: ReadonlyArray<[number, number, number, number]>, desc: ColormapDescriptor = {}): Colormap
const result = wgpu.colormap.fromPalette(colors, desc);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `colors` | `ReadonlyArray<[number, number, number, number]>` | Yes | Palette colors used to build a colormap. |
| `desc` | `ColormapDescriptor` | No | Optional filter and input color-space controls. The `resolution` field has no supported effect here. |

## Returns
`Colormap` - Immutable colormap backed by the copied palette and requested filtering mode.

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
| `resolution` | `number` | No | Accepted for descriptor compatibility but has no supported effect. |
| `filter` | `ColormapFilter` | No | Lookup filtering; default `"nearest"`. |
| `colorSpace` | `"srgb" \| "linear"` | No | Input RGB interpretation; default `"srgb"`. |

### ColormapFilter

```ts
type ColormapFilter = "linear" | "nearest";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const colors = [[0.1, 0.2, 0.8, 1], [0.9, 0.9, 0.2, 1]];
const desc = { filter: "linear", colorSpace: "srgb" };
const result = wgpu.colormap.fromPalette(colors, desc);
console.log(result.sampleCPU(0.5));
```

## See Also
- [colormap.builtin](./colormap-builtin.md)
- [colormap.fromStops](./colormap-fromstops.md)
- [colormap.grayscale](./colormap-grayscale.md)
- [colormap.inferno](./colormap-inferno.md)
- [colormap.magma](./colormap-magma.md)
- [colormap.plasma](./colormap-plasma.md)
- [colormap.turbo](./colormap-turbo.md)
- [colormap.viridis](./colormap-viridis.md)
