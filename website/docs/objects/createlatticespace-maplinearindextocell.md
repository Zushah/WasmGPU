# createLatticeSpace#mapLinearIndexToCell

## Summary

`createLatticeSpace#mapLinearIndexToCell()` decodes an X-fastest linear index into a two- or three-dimensional cell index.

## Syntax

```ts
LatticeSpace.mapLinearIndexToCell(index: number): LatticeSpaceIndex | null
```

## Returns

`LatticeSpaceIndex | null` - The decoded index, or `null` when the linear index is outside `[0, cellCount)`.

## See Also

- [createLatticeSpace#mapCellIndexToLinear](./createlatticespace-mapcellindextolinear.md)
- [createLatticeSpace#dimensions](./createlatticespace-dimensions.md)
