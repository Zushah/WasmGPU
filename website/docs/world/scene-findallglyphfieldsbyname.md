# Scene.findAllGlyphFieldsByName

## Summary
Scene.findAllGlyphFieldsByName returns all glyph fields whose `name` equals the given value. This supports grouped glyph workflows where several fields share one logical identifier. Returns an empty array when nothing matches.

## Syntax
```ts
Scene.findAllGlyphFieldsByName(name: string): GlyphField[]
const fields = scene.findAllGlyphFieldsByName(name);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Exact glyph field name to match. |

## Returns
`GlyphField[]` - Array of matching glyph fields.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
for (let i = 0; i < 2; i++) {
    const glyphs = wgpu.createGlyphField({ instanceCount: 0, scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
    glyphs.name = "vectors";
    scene.add(glyphs);
}
console.log(scene.findAllGlyphFieldsByName("vectors").length);
```

## See Also
- [Scene.findGlyphFieldByName](./scene-findglyphfieldbyname.md)
- [Scene.glyphFields](./scene-glyphfields.md)
- [Scene.visibleGlyphFields](./scene-visibleglyphfields.md)
