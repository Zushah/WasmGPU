# colormap.builtin

## Summary
colormap.builtin returns the process-wide singleton for a named built-in lookup table. Repeated calls with the same name return the same immutable `Colormap`, which supports CPU sampling and GPU binding.

## Syntax
```ts
WasmGPU.colormap.builtin(name: BuiltinColormapName): Colormap
const result = wgpu.colormap.builtin(name);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `BuiltinColormapName` | Yes | One of the six supported built-in palette names. |

## Returns
`Colormap` - Immutable process-wide singleton for the requested built-in table.

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
console.log(result.sampleCPU(0.5));
```

## See Also
- [colormap.fromPalette](./colormap-frompalette.md)
- [colormap.fromStops](./colormap-fromstops.md)
- [colormap.grayscale](./colormap-grayscale.md)
- [colormap.inferno](./colormap-inferno.md)
- [colormap.magma](./colormap-magma.md)
- [colormap.plasma](./colormap-plasma.md)
- [colormap.turbo](./colormap-turbo.md)
- [colormap.viridis](./colormap-viridis.md)
