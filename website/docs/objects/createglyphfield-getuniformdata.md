# createGlyphField#getUniformData

## Summary
createGlyphField#getUniformData creates a new 60-float uniform snapshot containing scale mapping, clamped opacity, color mode, lighting flag, solid color, and up to eight custom stops. Mutating it does not change the field.

## Syntax
```ts
GlyphField.getUniformData(): Float32Array
const result = glyphField.getUniformData();
```

## Returns
The new 60-element uniform snapshot.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const glyphField = wgpu.createGlyphField({ instanceCount: 1, positions: new Float32Array([0, 0, 0, 0]), rotations: new Float32Array([0, 0, 0, 1]), scales: new Float32Array([1, 1, 1, 0]), attributes: new Float32Array([0.5, 0, 0, 0]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const uniforms = glyphField.getUniformData();
console.log(uniforms.length); // 60
```

## See Also
- [createGlyphField#dirtyUniforms](./createglyphfield-dirtyuniforms.md)
- [createGlyphField#getUniformBufferSize](./createglyphfield-getuniformbuffersize.md)
- [createGlyphField#markUniformsClean](./createglyphfield-markuniformsclean.md)
