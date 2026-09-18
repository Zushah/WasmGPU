# material.unlit#baseColorTexture

## Summary
material.unlit#baseColorTexture gets or sets the optional sampled base-color texture. The material borrows the `Texture2D`; replacement or material destruction does not destroy it. Assignment marks material state dirty.

## Syntax
```ts
UnlitMaterial.baseColorTexture: Texture2D | null
material.baseColorTexture = value;
const value = material.baseColorTexture;
```

## Returns
`Texture2D | null` - Borrowed base-color texture, or `null` when none is assigned.

## See Also
- [material.unlit#color](./material-unlit-color.md)
- [texture.create2D#ensureUploaded](./texture-create2d-ensureuploaded.md)
