# material.standard#normalScale

## Summary
material.standard#normalScale gets or sets the tangent-space normal-map scale. Supply a finite value; negative values invert the mapped X and Y components. Assignment marks uniforms dirty and the default is `1`.

## Syntax
```ts
StandardMaterial.normalScale: number
material.normalScale = value;
const value = material.normalScale;
```

## Returns
`number` - Current normal-map scale.

## See Also
- [material.standard#getUniformData](./material-standard-getuniformdata.md)
- [material.standard#normalTexture](./material-standard-normaltexture.md)
