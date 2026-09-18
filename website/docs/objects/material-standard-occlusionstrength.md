# material.standard#occlusionStrength

## Summary
material.standard#occlusionStrength gets or sets the occlusion-texture contribution in `[0, 1]`. Supply a finite value; assignment marks uniforms dirty and the default is `1`.

## Syntax
```ts
StandardMaterial.occlusionStrength: number
material.occlusionStrength = value;
const value = material.occlusionStrength;
```

## Returns
`number` - Current ambient-occlusion contribution.

## See Also
- [material.standard#getUniformData](./material-standard-getuniformdata.md)
- [material.standard#occlusionTexture](./material-standard-occlusiontexture.md)
