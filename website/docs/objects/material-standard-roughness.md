# material.standard#roughness

## Summary
material.standard#roughness gets or sets the perceptual roughness factor. Assignment clamps the value to `[0, 1]` and marks uniforms dirty; the default is `1`.

## Syntax
```ts
StandardMaterial.roughness: number
material.roughness = value;
const value = material.roughness;
```

## Returns
`number` - Current clamped perceptual roughness factor.

## See Also
- [material.standard#getUniformData](./material-standard-getuniformdata.md)
- [material.standard#metallic](./material-standard-metallic.md)
- [material.standard#metallicRoughnessTexture](./material-standard-metallicroughnesstexture.md)
