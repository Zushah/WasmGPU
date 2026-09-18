# createLatticeSpace#getColormapForBinding

## Summary

`createLatticeSpace#getColormapForBinding()` resolves the texture-backed `Colormap` to bind for rendering. Built-in names return their built-in map, and an explicit `Colormap` is returned unchanged.

## Syntax

```ts
LatticeSpace.getColormapForBinding(): Colormap
```

## Notes

For `colormap: "custom"`, the method returns the built-in grayscale map as a valid texture binding; rendering takes the actual custom colors from `colormapStops` in the lattice uniform data.

## See Also

- [createLatticeSpace#getColormapKey](./createlatticespace-getcolormapkey.md)
- [createLatticeSpace#colormapStops](./createlatticespace-colormapstops.md)
