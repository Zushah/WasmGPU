# material.standard#baseColorTexture

## Summary
material.standard#baseColorTexture gets or sets the optional base-color texture. The material borrows the texture rather than owning it; replacement or material destruction does not destroy the `Texture2D`.

## Syntax
```ts
StandardMaterial.baseColorTexture: Texture2D | null
material.baseColorTexture = value;
const value = material.baseColorTexture;
```

## Returns
`Texture2D | null` - Borrowed base-color texture, or `null` when none is assigned.

## See Also
- [material.standard#color](./material-standard-color.md)
- [material.standard#metallicRoughnessTexture](./material-standard-metallicroughnesstexture.md)
- [texture.create2D#ensureUploaded](./texture-create2d-ensureuploaded.md)
