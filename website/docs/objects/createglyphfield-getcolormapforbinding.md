# createGlyphField#getColormapForBinding

## Summary
createGlyphField#getColormapForBinding returns an existing `Colormap`, resolves a built-in name, or returns a grayscale texture fallback for `"custom"` because custom stops travel in uniforms.

## Syntax
```ts
GlyphField.getColormapForBinding(): Colormap
const result = glyphField.getColormapForBinding();
```

## Returns
The borrowed `Colormap` used for texture binding.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const colormap = glyphField.getColormapForBinding();
console.log(colormap === wgpu.colormap.viridis()); // true
```

## See Also
- [createGlyphField#colormap](./createglyphfield-colormap.md)
- [createGlyphField#colormapStops](./createglyphfield-colormapstops.md)
- [createGlyphField#getColormapKey](./createglyphfield-getcolormapkey.md)
