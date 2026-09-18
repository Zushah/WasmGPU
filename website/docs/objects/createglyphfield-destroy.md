# createGlyphField#destroy

## Summary
`createGlyphField#destroy` releases its transform, uniform buffer, retained records, Wasm-source references, listeners, and instance buffers it owns. Caller-supplied buffers are destroyed only when ownership was transferred with descriptor or setter option `ownBuffers: true`; borrowed buffers are detached.

The glyph geometry reference is not released or destroyed by this method. If the application created a custom `Geometry` solely for this field, manage that geometry's reference-counted lifetime separately.

## Syntax
```ts
GlyphField.destroy(): void
glyphField.destroy();
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
glyphField.destroy();
console.log(glyphField.positionsBuffer, glyphField.attributesBuffer); // null, null
```

## See Also
- [createGlyphField#upload](./createglyphfield-upload.md)
- [geometry#destroy](./geometry-destroy.md)
