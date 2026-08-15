# Scene.visibleGlyphFields

## Summary
Scene.visibleGlyphFields returns glyph fields currently marked visible. This filtered view is useful for rendering diagnostics and dynamic UI summaries.

## Syntax
```ts
Scene.visibleGlyphFields: GlyphField[]
const fields = scene.visibleGlyphFields;
```

## Parameters
This property does not take parameters.

## Returns
`GlyphField[]` - Visible glyph field subset.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const glyphs = wgpu.createGlyphField({ instanceCount: 0, scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
glyphs.visible = true;
scene.add(glyphs);
console.log(scene.visibleGlyphFields.length);
```

## See Also
- [Scene.glyphFields](./scene-glyphfields.md)
- [Scene.traverseVisibleGlyphFields](./scene-traversevisibleglyphfields.md)
- [Scene.getBounds](./scene-getbounds.md)
