# material.standard#metallic

## Summary
material.standard#metallic gets or sets the metallic factor. Assignment clamps the value to `[0, 1]` and marks uniforms dirty; the default is `0`.

## Syntax
```ts
StandardMaterial.metallic: number
material.metallic = value;
const value = material.metallic;
```

## Returns
`number` - Current clamped metallic factor.

## See Also
- [material.standard#getUniformData](./material-standard-getuniformdata.md)
- [material.standard#metallicRoughnessTexture](./material-standard-metallicroughnesstexture.md)
- [material.standard#roughness](./material-standard-roughness.md)
