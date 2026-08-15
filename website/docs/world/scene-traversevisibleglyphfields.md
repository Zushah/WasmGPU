# Scene.traverseVisibleGlyphFields

## Summary
Scene.traverseVisibleGlyphFields iterates over glyph fields whose `visible` flag is true. This is the visible-only variant for frame-time updates and selective processing.

## Syntax
```ts
Scene.traverseVisibleGlyphFields(callback: (g: GlyphField) => void): void
scene.traverseVisibleGlyphFields(callback);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `callback` | `(g: GlyphField) => void` | Yes | Function executed once per visible glyph field. |

## Returns
`void` - No return value.

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
scene.traverseVisibleGlyphFields((g) => {
    g.lit = true;
});
```

## See Also
- [Scene.traverseGlyphFields](./scene-traverseglyphfields.md)
- [Scene.visibleGlyphFields](./scene-visibleglyphfields.md)
- [Scene.getBounds](./scene-getbounds.md)
