# Scene.clearGlyphFields

## Summary
Scene.clearGlyphFields removes only glyph field objects from the scene. Meshes, point clouds, node links, splat fields, lattice spaces, and lights are left intact. This is useful when glyph visualizations are updated independently of other world content.

## Syntax
```ts
Scene.clearGlyphFields(): Scene
const result = scene.clearGlyphFields();
```

## Parameters
This method does not take parameters.

## Returns
`Scene` - The same scene instance with `glyphFields` cleared.

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
scene.add(glyphs);
scene.clearGlyphFields();
console.log(scene.glyphFields.length);
```

## See Also
- [Scene.clear](./scene-clear.md)
- [Scene.glyphFields](./scene-glyphfields.md)
- [Scene.traverseGlyphFields](./scene-traverseglyphfields.md)
- [Scene.traverseVisibleGlyphFields](./scene-traversevisibleglyphfields.md)
