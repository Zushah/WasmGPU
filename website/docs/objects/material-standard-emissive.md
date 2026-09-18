# material.standard#emissive

## Summary
material.standard#emissive gets or sets the RGB emissive factor. Supply three finite, nonnegative components; values above `1` can represent high-intensity emission. Assignment marks uniforms dirty.

## Syntax
```ts
StandardMaterial.emissive: Color
material.emissive = value;
const value = material.emissive;
```

## Returns
`Color` - Current emissive RGB factor.

## Type Details
### Color

```ts
type Color = [number, number, number];
```

## See Also
- [material.standard#color](./material-standard-color.md)
- [material.standard#emissiveIntensity](./material-standard-emissiveintensity.md)
- [material.standard#emissiveTexture](./material-standard-emissivetexture.md)
