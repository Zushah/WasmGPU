# createPointCloud#colormap

## Summary
createPointCloud#colormap gets or sets the built-in/custom colormap selection or a `Colormap` object. Assignment emits a `"colormap"` visual-change event and affects subsequent scalar-color rendering; `"custom"` uses `colormapStops`.

## Syntax
```ts
PointCloud.colormap: PointCloudColormap | Colormap
const value = pointCloud.colormap;
pointCloud.colormap = "magma";
```

## Returns
`PointCloudColormap | Colormap` - Current built-in/custom selection or borrowed `Colormap` instance.

## Type Details
### PointCloudColormap

```ts
type PointCloudColormap = BuiltinColormapName | "custom";
```

### BuiltinColormapName

```ts
type BuiltinColormapName = "grayscale" | "turbo" | "viridis" | "magma" | "plasma" | "inferno";
```

## See Also
- [createPointCloud#colormapStops](./createpointcloud-colormapstops.md)
- [createPointCloud#getColormapForBinding](./createpointcloud-getcolormapforbinding.md)
- [createPointCloud#onVisualChange](./createpointcloud-onvisualchange.md)
