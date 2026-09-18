# createScene#traverseGlyphFields

## Summary
createScene#traverseGlyphFields iterates over all glyph fields in the scene. Use this to apply common glyph configuration updates or collect aggregate glyph metadata.

## Syntax
```ts
Scene.traverseGlyphFields(callback: (g: GlyphField) => void): void
scene.traverseGlyphFields(callback);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `callback` | `(g: GlyphField) => void` | Yes | Function executed once per glyph field. |

## Returns
`void` - No return value.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
scene.add(wgpu.createGlyphField({ instanceCount: 0, scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } }));
scene.traverseGlyphFields((g) => {
    g.opacity = 0.9;
});
```

## See Also
- [createScene#traverseVisibleGlyphFields](./createscene-traversevisibleglyphfields.md)
- [createScene#glyphFields](./createscene-glyphfields.md)
- [createScene#clearGlyphFields](./createscene-clearglyphfields.md)
