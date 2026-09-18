# createLatticeSpace#colormap

## Summary

`createLatticeSpace#colormap` selects a built-in colormap name, `"custom"`, or a `Colormap` object for scalar rendering.

When selecting `"custom"`, assign `colormapStops` after changing `colormap` so the custom-stop configuration is applied with the new selection.

## Syntax

```ts
LatticeSpace.colormap: LatticeSpaceColormap | Colormap
```

## See Also

- [createLatticeSpace#colormapStops](./createlatticespace-colormapstops.md)
- [createLatticeSpace#getColormapForBinding](./createlatticespace-getcolormapforbinding.md)
