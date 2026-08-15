# LatticeSpace.dimensions

## Summary

`LatticeSpace.dimensions` is the immutable `[x, y]` or `[x, y, z]` cell shape supplied at construction.

## Syntax

```ts
readonly LatticeSpace.dimensions: [number, number] | [number, number, number]
```

## Notes

Storage is X-fastest: the first dimension varies fastest in linear indexing.

## See Also

- [LatticeSpace.dimensionCount](./latticespace-dimensioncount.md)
- [LatticeSpace.mapCellIndexToLinear](./latticespace-mapcellindextolinear.md)
