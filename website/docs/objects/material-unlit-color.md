# material.unlit#color

## Summary
material.unlit#color gets or sets the RGB base color used by unlit shading. Supply three finite components in `[0, 1]`; assignment marks uniforms dirty.

## Syntax
```ts
UnlitMaterial.color: Color
material.color = value;
const value = material.color;
```

## Returns
`Color` - Current RGB base color.

## Type Details
### Color

```ts
type Color = [number, number, number];
```

## See Also
- [material.unlit#baseColorTexture](./material-unlit-basecolortexture.md)
- [material.unlit#getUniformData](./material-unlit-getuniformdata.md)
- [material.unlit#opacity](./material-unlit-opacity.md)
