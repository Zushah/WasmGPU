# material.standard#normalTexture

## Summary
material.standard#normalTexture gets or sets the borrowed tangent-space normal texture. Replacing the value or destroying the material does not destroy the texture.

## Syntax
```ts
StandardMaterial.normalTexture: Texture2D | null
material.normalTexture = value;
const value = material.normalTexture;
```

## Returns
`Texture2D | null` - Borrowed normal texture, or `null` when none is assigned.

## See Also
- [material.standard#normalScale](./material-standard-normalscale.md)
- [texture.create2D#ensureUploaded](./texture-create2d-ensureuploaded.md)
