# material.standard#color

## Summary
material.standard#color gets or sets the RGB base-color factor. Supply three finite components in `[0, 1]`; assignment marks uniforms dirty.

## Syntax
```ts
StandardMaterial.color: Color
material.color = value;
const value = material.color;
```

## Returns
`Color` - Current RGB base-color factor.

## Type Details
### Color

```ts
type Color = [number, number, number];
```

## See Also
- [material.standard#baseColorTexture](./material-standard-basecolortexture.md)
- [material.standard#emissive](./material-standard-emissive.md)
- [material.standard#getUniformData](./material-standard-getuniformdata.md)
