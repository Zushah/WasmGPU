# material.data#opacity

## Summary
material.data#opacity gets or sets the stored opacity scalar and marks uniforms dirty on change. The setter stores values without clamping; uniform packing clamps the value to `[0, 1]`.

## Syntax
```ts
DataMaterial.opacity: number
material.opacity = value;
const value = material.opacity;
```

## Returns
The stored opacity value. This getter can return a value outside `[0, 1]`; uniform packing applies the clamp.

## See Also
- [material.data#getUniformData](./material-data-getuniformdata.md)
- [material.data#shading](./material-data-shading.md)
