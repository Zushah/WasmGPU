# createScene#findGlyphFieldByName

## Summary
createScene#findGlyphFieldByName returns the first glyph field whose `name` exactly matches the input string. It searches only glyph field objects. This is the single-match lookup variant for glyph data.

## Syntax
```ts
Scene.findGlyphFieldByName(name: string): GlyphField | undefined
const glyphField = scene.findGlyphFieldByName(name);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Exact glyph field name to search for. |

## Returns
`GlyphField | undefined` - First matching glyph field, or `undefined` if absent.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const glyphs = wgpu.createGlyphField({ instanceCount: 0, scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
glyphs.name = "vectors";
scene.add(glyphs);

console.log(scene.findGlyphFieldByName("vectors"));
```

## See Also
- [createScene#findAllGlyphFieldsByName](./createscene-findallglyphfieldsbyname.md)
- [createScene#glyphFields](./createscene-glyphfields.md)
- [createScene#traverseGlyphFields](./createscene-traverseglyphfields.md)
