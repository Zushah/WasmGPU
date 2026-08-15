# Scene.glyphFields

## Summary
Scene.glyphFields returns all glyph field objects currently attached to the scene. This includes visible and hidden fields. Use it for diagnostics and bulk glyph configuration changes.

## Syntax
```ts
Scene.glyphFields: readonly GlyphField[]
const fields = scene.glyphFields;
```

## Parameters
This property does not take parameters.

## Returns
`readonly GlyphField[]` - Scene glyph field collection.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
scene.add(wgpu.createGlyphField({ instanceCount: 0, scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } }));
console.log(scene.glyphFields.length);
```

## See Also
- [Scene.visibleGlyphFields](./scene-visibleglyphfields.md)
- [Scene.clearGlyphFields](./scene-clearglyphfields.md)
- [Scene.traverseGlyphFields](./scene-traverseglyphfields.md)
