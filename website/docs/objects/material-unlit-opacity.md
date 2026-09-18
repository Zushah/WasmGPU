# material.unlit#opacity

## Summary
material.unlit#opacity gets or sets a finite opacity value in `[0, 1]`. Assignment marks uniforms dirty but does not change the material's readonly `blendMode`, which is selected at construction unless explicitly supplied.

## Syntax
```ts
UnlitMaterial.opacity: number
material.opacity = value;
const value = material.opacity;
```

## Returns
`number` - Current opacity value.

## See Also
- [material.unlit#alphaCutoff](./material-unlit-alphacutoff.md)
- [material.unlit#getUniformData](./material-unlit-getuniformdata.md)
