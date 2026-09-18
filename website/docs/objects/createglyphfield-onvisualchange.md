# createGlyphField#onVisualChange

## Summary
createGlyphField#onVisualChange registers for scale and colormap changes and returns an unsubscribe callback. Listener exceptions are ignored. Although the callback type includes `"visual"`, no general visual-change notification is currently supported.

## Syntax
```ts
GlyphField.onVisualChange(listener: (kind: GlyphFieldVisualChangeKind) => void): () => void
const result = glyphField.onVisualChange(listener);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `listener` | `(kind: GlyphFieldVisualChangeKind) => void` | Yes | Callback invoked when visual-relevant state changes. |

## Returns
`() => void` - Function that unsubscribes or unregisters the listener created by this call.

## Type Details
### GlyphFieldVisualChangeKind

```ts
type GlyphFieldVisualChangeKind = "scale" | "colormap" | "visual";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const listener = (kind) => console.log(kind);
const result = glyphField.onVisualChange(listener);
console.log(result);
```

## See Also
- [createGlyphField#applyScaleStats](./createglyphfield-applyscalestats.md)
- [createGlyphField#colormap](./createglyphfield-colormap.md)
- [createGlyphField#colormapStops](./createglyphfield-colormapstops.md)
- [createGlyphField#colorMode](./createglyphfield-colormode.md)
- [createGlyphField#computeBoundsFromCPUData](./createglyphfield-computeboundsfromcpudata.md)
- [createGlyphField#destroy](./createglyphfield-destroy.md)
- [createGlyphField#dirtyUniforms](./createglyphfield-dirtyuniforms.md)
- [createGlyphField#getAttributeRecord](./createglyphfield-getattributerecord.md)
- [createGlyphField#getBounds](./createglyphfield-getbounds.md)
- [createGlyphField#getColormapForBinding](./createglyphfield-getcolormapforbinding.md)
- [createGlyphField#getColormapKey](./createglyphfield-getcolormapkey.md)
- [createGlyphField#getLocalBounds](./createglyphfield-getlocalbounds.md)
