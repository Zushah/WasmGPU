# createGlyphField#solidColor

## Summary
createGlyphField#solidColor gets or sets the RGBA value used by `colorMode = "solid"`. Assignment copies the tuple. The getter returns the stored tuple by reference; treat it as read-only and assign a new tuple to make a tracked change.

## Syntax
```ts
GlyphField.solidColor: Color4
const value = glyphField.solidColor;
glyphField.solidColor = [0.2, 0.6, 1, 1];
```

## Returns
`Color4` - Stored RGBA tuple, returned by reference.

## Type Details
### Color4

```ts
type Color4 = [number, number, number, number];
```

## See Also
- [createGlyphField#colorMode](./createglyphfield-colormode.md)
- [createGlyphField#colormap](./createglyphfield-colormap.md)
