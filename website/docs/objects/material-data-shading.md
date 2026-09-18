# material.data#shading

## Summary
material.data#shading gets or sets the stored shading blend and marks uniforms dirty on change. The setter stores values without clamping; uniform packing clamps the value to `[0, 1]`.

## Syntax
```ts
DataMaterial.shading: number
material.shading = value;
const value = material.shading;
```

## Returns
The stored shading blend. This getter can return a value outside `[0, 1]`; uniform packing applies the clamp.

## See Also
- [material.data#getUniformData](./material-data-getuniformdata.md)
- [material.data#opacity](./material-data-opacity.md)
