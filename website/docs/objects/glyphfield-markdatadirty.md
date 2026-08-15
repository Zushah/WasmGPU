# GlyphField.markDataDirty

## Summary
GlyphField.markDataDirty updates internal dirty/clean tracking flags that control upload or uniform refresh behavior.

## Syntax
```ts
GlyphField.markDataDirty(): void
glyphField.markDataDirty();
```

## Parameters
This API does not take parameters.

## Returns
`void` - No return value. The call applies side effects to runtime state and/or GPU resources.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
glyphField.markDataDirty();
console.log("updated");
```

## See Also
- [GlyphField.applyScaleStats](./glyphfield-applyscalestats.md)
- [GlyphField.colormap](./glyphfield-colormap.md)
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
