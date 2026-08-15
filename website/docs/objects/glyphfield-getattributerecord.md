# GlyphField.getAttributeRecord

## Summary
GlyphField.getAttributeRecord returns the current attribute record value derived from this GlyphField runtime state.

## Syntax
```ts
GlyphField.getAttributeRecord(index: number): [number, number, number, number] | null
const result = glyphField.getAttributeRecord(index);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `index` | `number` | Yes | Linear element index into CPU-backed arrays. |

## Returns
`[number, number, number, number] | null` - Result produced by this API call as `[number, number, number, number] | null`.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const index = 0;
const result = glyphField.getAttributeRecord(index);
console.log(result);
```

## See Also
- [GlyphField.applyScaleStats](./glyphfield-applyscalestats.md)
- [GlyphField.colormap](./glyphfield-colormap.md)
- [GlyphField.colormapStops](./glyphfield-colormapstops.md)
- [GlyphField.colorMode](./glyphfield-colormode.md)
- [GlyphField.computeBoundsFromCPUData](./glyphfield-computeboundsfromcpudata.md)
- [GlyphField.destroy](./glyphfield-destroy.md)
- [GlyphField.dirtyUniforms](./glyphfield-dirtyuniforms.md)
- [GlyphField.getBounds](./glyphfield-getbounds.md)
- [GlyphField.getColormapForBinding](./glyphfield-getcolormapforbinding.md)
- [GlyphField.getColormapKey](./glyphfield-getcolormapkey.md)
- [GlyphField.getLocalBounds](./glyphfield-getlocalbounds.md)
- [GlyphField.getScaleSourceDescriptor](./glyphfield-getscalesourcedescriptor.md)
