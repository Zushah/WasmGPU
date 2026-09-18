# createGlyphField#computeBoundsFromCPUData

## Summary
createGlyphField#computeBoundsFromCPUData derives local bounds from retained positions, scales, optional rotations, and the glyph geometry's local box. It is a no-op without retained positions/scales or instances and replaces prior bounds with computed bounds.

## Syntax
```ts
GlyphField.computeBoundsFromCPUData(): void
glyphField.computeBoundsFromCPUData();
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
glyphField.computeBoundsFromCPUData();
console.log(glyphField.getLocalBounds().empty); // false
```

## See Also
- [createGlyphField#getBounds](./createglyphfield-getbounds.md)
- [createGlyphField#getLocalBounds](./createglyphfield-getlocalbounds.md)
- [createGlyphField#getWorldBounds](./createglyphfield-getworldbounds.md)
