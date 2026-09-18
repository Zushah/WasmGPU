# material.unlit#alphaCutoff

## Summary
material.unlit#alphaCutoff gets or sets the finite fragment alpha-discard threshold in `[0, 1]`. Assignment marks uniforms dirty and the default is `0`.

## Syntax
```ts
UnlitMaterial.alphaCutoff: number
material.alphaCutoff = value;
const value = material.alphaCutoff;
```

## Returns
`number` - Current alpha-discard threshold.

## See Also
- [material.unlit#baseColorTexture](./material-unlit-basecolortexture.md)
- [material.unlit#getUniformData](./material-unlit-getuniformdata.md)
- [material.unlit#opacity](./material-unlit-opacity.md)
