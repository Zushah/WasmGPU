# createScene#clearGlyphFields

## Summary
createScene#clearGlyphFields removes only glyph field objects from the scene. Meshes, point clouds, node links, splat fields, lattice spaces, and lights are left intact. This is useful when glyph visualizations are updated independently of other world content.
Detached glyph fields are not destroyed.

## Syntax
```ts
Scene.clearGlyphFields(): Scene
const result = scene.clearGlyphFields();
```

## Parameters
This method does not take parameters.

## Returns
`Scene` - The same scene instance with `glyphFields` cleared.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const glyphs = wgpu.createGlyphField({ instanceCount: 0, scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
scene.add(glyphs);
scene.clearGlyphFields();
console.log(scene.glyphFields.length);
```

## See Also
- [createScene#clear](./createscene-clear.md)
- [createScene#glyphFields](./createscene-glyphfields.md)
- [createScene#traverseGlyphFields](./createscene-traverseglyphfields.md)
- [createScene#traverseVisibleGlyphFields](./createscene-traversevisibleglyphfields.md)
