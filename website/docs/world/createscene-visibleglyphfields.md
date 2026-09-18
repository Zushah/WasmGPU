# createScene#visibleGlyphFields

## Summary
createScene#visibleGlyphFields returns glyph fields currently marked visible. This filtered view is useful for rendering diagnostics and dynamic UI summaries.

## Syntax
```ts
Scene.visibleGlyphFields: GlyphField[]
const fields = scene.visibleGlyphFields;
```

## Parameters
This property does not take parameters.

## Returns
`GlyphField[]` - Visible glyph field subset.

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
- [createScene#glyphFields](./createscene-glyphfields.md)
- [createScene#traverseVisibleGlyphFields](./createscene-traversevisibleglyphfields.md)
- [createScene#getBounds](./createscene-getbounds.md)
