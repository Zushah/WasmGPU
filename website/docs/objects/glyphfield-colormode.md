# GlyphField.colorMode

## Summary
GlyphField.colorMode reads the current `colorMode` value from this GlyphField instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
GlyphField.colorMode: GlyphColorMode
const value = glyphField.colorMode;
```

## Parameters
This API does not take parameters.

## Returns
`GlyphColorMode` - Current accessor value exposed by the runtime object.

## Type Details
### GlyphColorMode

```ts
type GlyphColorMode = "rgba" | "scalar" | "solid";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const value = glyphField.colorMode;
console.log(value);
```

## See Also
- [GlyphField.applyScaleStats](./glyphfield-applyscalestats.md)
- [GlyphField.colormap](./glyphfield-colormap.md)
- [GlyphField.colormapStops](./glyphfield-colormapstops.md)
- [GlyphField.computeBoundsFromCPUData](./glyphfield-computeboundsfromcpudata.md)
- [GlyphField.destroy](./glyphfield-destroy.md)
- [GlyphField.dirtyUniforms](./glyphfield-dirtyuniforms.md)
- [GlyphField.getAttributeRecord](./glyphfield-getattributerecord.md)
- [GlyphField.getBounds](./glyphfield-getbounds.md)
- [GlyphField.getColormapForBinding](./glyphfield-getcolormapforbinding.md)
- [GlyphField.getColormapKey](./glyphfield-getcolormapkey.md)
- [GlyphField.getLocalBounds](./glyphfield-getlocalbounds.md)
- [GlyphField.getScaleSourceDescriptor](./glyphfield-getscalesourcedescriptor.md)
