# material.standard#emissiveTexture

## Summary
material.standard#emissiveTexture gets or sets the borrowed emissive texture. Replacing the value or destroying the material does not destroy the texture.

## Syntax
```ts
StandardMaterial.emissiveTexture: Texture2D | null
material.emissiveTexture = value;
const value = material.emissiveTexture;
```

## Returns
`Texture2D | null` - Borrowed emissive texture, or `null` when none is assigned.

## See Also
- [material.standard#emissive](./material-standard-emissive.md)
- [material.standard#emissiveIntensity](./material-standard-emissiveintensity.md)
- [texture.create2D#ensureUploaded](./texture-create2d-ensureuploaded.md)
