# createScene#glyphFields

## Summary
createScene#glyphFields returns all glyph field objects currently attached to the scene. This includes visible and hidden fields. Use it for diagnostics and bulk glyph configuration changes.

## Syntax
```ts
Scene.glyphFields: readonly GlyphField[]
const fields = scene.glyphFields;
```

## Parameters
This property does not take parameters.

## Returns
`readonly GlyphField[]` - Scene glyph field collection.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
scene.add(wgpu.createGlyphField({ instanceCount: 0, scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } }));
console.log(scene.glyphFields.length);
```

## See Also
- [createScene#visibleGlyphFields](./createscene-visibleglyphfields.md)
- [createScene#clearGlyphFields](./createscene-clearglyphfields.md)
- [createScene#traverseGlyphFields](./createscene-traverseglyphfields.md)
