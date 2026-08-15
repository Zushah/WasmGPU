# GlyphField.colormap

## Summary
GlyphField.colormap reads the current `colormap` value from this GlyphField instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
GlyphField.colormap: GlyphColormap | Colormap
const value = glyphField.colormap;
```

## Parameters
This API does not take parameters.

## Returns
`GlyphColormap | Colormap` - Current accessor value exposed by the runtime object.

## Type Details
### GlyphColormap

```ts
type GlyphColormap = BuiltinColormapName | "custom";
```

### BuiltinColormapName

```ts
type BuiltinColormapName = "grayscale" | "turbo" | "viridis" | "magma" | "plasma" | "inferno";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const value = glyphField.colormap;
console.log(value);
```

## See Also
- [GlyphField.applyScaleStats](./glyphfield-applyscalestats.md)
- [GlyphField.colormapStops](./glyphfield-colormapstops.md)
- [GlyphField.colorMode](./glyphfield-colormode.md)
- [GlyphField.computeBoundsFromCPUData](./glyphfield-computeboundsfromcpudata.md)
- [GlyphField.destroy](./glyphfield-destroy.md)
- [GlyphField.dirtyUniforms](./glyphfield-dirtyuniforms.md)
- [GlyphField.getAttributeRecord](./glyphfield-getattributerecord.md)
- [GlyphField.getBounds](./glyphfield-getbounds.md)
- [GlyphField.getColormapForBinding](./glyphfield-getcolormapforbinding.md)
- [GlyphField.getColormapKey](./glyphfield-getcolormapkey.md)
- [GlyphField.getLocalBounds](./glyphfield-getlocalbounds.md)
- [GlyphField.getScaleSourceDescriptor](./glyphfield-getscalesourcedescriptor.md)
