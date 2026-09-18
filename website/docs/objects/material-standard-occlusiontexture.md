# material.standard#occlusionTexture

## Summary
material.standard#occlusionTexture gets or sets the borrowed ambient-occlusion texture. Replacing the value or destroying the material does not destroy the texture.

## Syntax
```ts
StandardMaterial.occlusionTexture: Texture2D | null
material.occlusionTexture = value;
const value = material.occlusionTexture;
```

## Returns
`Texture2D | null` - Borrowed ambient-occlusion texture, or `null` when none is assigned.

## See Also
- [material.standard#occlusionStrength](./material-standard-occlusionstrength.md)
- [texture.create2D#ensureUploaded](./texture-create2d-ensureuploaded.md)
