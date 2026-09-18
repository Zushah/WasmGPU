# material.standard#opacity

## Summary
material.standard#opacity gets or sets a finite opacity factor in `[0, 1]`. Assignment marks uniforms dirty but does not change the readonly `blendMode`, which is chosen at construction unless explicitly supplied.

## Syntax
```ts
StandardMaterial.opacity: number
material.opacity = value;
const value = material.opacity;
```

## Returns
`number` - Current opacity factor.

## See Also
- [material.standard#alphaCutoff](./material-standard-alphacutoff.md)
- [material.standard#getUniformData](./material-standard-getuniformdata.md)
