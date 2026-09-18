# createLatticeSpace#mapCellIndexToLinear

## Summary

`createLatticeSpace#mapCellIndexToLinear()` encodes a valid two- or three-dimensional cell index using X-fastest storage order.

## Syntax

```ts
LatticeSpace.mapCellIndexToLinear(index: ReadonlyArray<number>): number
```

## Returns

`number` - The zero-based linear cell index.

## Notes

The method throws when rank or components fall outside `dimensions`.

## See Also

- [createLatticeSpace#mapLinearIndexToCell](./createlatticespace-maplinearindextocell.md)
- [createLatticeSpace#getCellRecord](./createlatticespace-getcellrecord.md)
