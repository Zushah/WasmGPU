# material.data#colormap

## Summary
material.data#colormap gets or sets either a built-in colormap name or a borrowed `Colormap` instance. Assignment affects subsequent scalar-color rendering and emits a `"colormap"` visual-change notification; the material does not destroy an assigned instance.

## Syntax
```ts
DataMaterial.colormap: BuiltinColormapName | Colormap
material.colormap = value;
const value = material.colormap;
```

## Returns
`BuiltinColormapName | Colormap` - Current built-in name or borrowed colormap instance.

## Type Details
### BuiltinColormapName

```ts
type BuiltinColormapName = "grayscale" | "turbo" | "viridis" | "magma" | "plasma" | "inferno";
```

## See Also
- [material.data#getColormapForBinding](./material-data-getcolormapforbinding.md)
- [material.data#onVisualChange](./material-data-onvisualchange.md)
