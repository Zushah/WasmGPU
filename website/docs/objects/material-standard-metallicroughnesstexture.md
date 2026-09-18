# material.standard#metallicRoughnessTexture

## Summary
material.standard#metallicRoughnessTexture gets or sets the borrowed metallic-roughness texture. Replacing the value or destroying the material does not destroy the texture.

## Syntax
```ts
StandardMaterial.metallicRoughnessTexture: Texture2D | null
material.metallicRoughnessTexture = value;
const value = material.metallicRoughnessTexture;
```

## Returns
`Texture2D | null` - Borrowed metallic-roughness texture, or `null` when none is assigned.

## See Also
- [material.standard#metallic](./material-standard-metallic.md)
- [material.standard#roughness](./material-standard-roughness.md)
- [texture.create2D#ensureUploaded](./texture-create2d-ensureuploaded.md)
