# material.standard#alphaCutoff

## Summary
material.standard#alphaCutoff gets or sets the finite fragment alpha-discard threshold in `[0, 1]`. Assignment marks uniforms dirty and the default is `0`.

## Syntax
```ts
StandardMaterial.alphaCutoff: number
material.alphaCutoff = value;
const value = material.alphaCutoff;
```

## Returns
`number` - Current alpha-discard threshold.

## See Also
- [material.standard#baseColorTexture](./material-standard-basecolortexture.md)
- [material.standard#opacity](./material-standard-opacity.md)
- [material.standard#getUniformData](./material-standard-getuniformdata.md)
