# material.standard#emissiveIntensity

## Summary
material.standard#emissiveIntensity gets or sets the finite, nonnegative multiplier applied to the emissive factor and texture. Assignment marks uniforms dirty and the default is `0`.

## Syntax
```ts
StandardMaterial.emissiveIntensity: number
material.emissiveIntensity = value;
const value = material.emissiveIntensity;
```

## Returns
`number` - Current emissive multiplier.

## See Also
- [material.standard#emissive](./material-standard-emissive.md)
- [material.standard#emissiveTexture](./material-standard-emissivetexture.md)
- [material.standard#getUniformData](./material-standard-getuniformdata.md)
