# createLatticeSpace#indexRange

## Summary

`createLatticeSpace#indexRange` clips drawing to a half-open multidimensional range.

## Syntax

```ts
LatticeSpace.indexRange: { min: LatticeSpaceIndex; max: LatticeSpaceIndex }
```

## Notes

Rank must match `dimensions`; every `max` component must be greater than `min` and remain within the lattice. The getter returns copies.

## See Also

- [createLatticeSpace#drawCellCount](./createlatticespace-drawcellcount.md)
- [createLatticeSpace#getLocalBounds](./createlatticespace-getlocalbounds.md)
