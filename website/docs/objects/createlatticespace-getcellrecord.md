# createLatticeSpace#getCellRecord

## Summary

`createLatticeSpace#getCellRecord()` returns retained values and derived presentation data for one linear cell.

## Syntax

```ts
LatticeSpace.getCellRecord(index: number): LatticeSpaceCellRecord | null
```

## Returns

`LatticeSpaceCellRecord | null` - Spatial index, center, retained values, derived scalar, optional RGBA color, and activity; or `null` when `index` is not an integer in `[0, cellCount)`.

## Notes

The spatial index and center are available without retained CPU data. In that case `values` is empty, `scalar` and `color` are `null`, and `active` is `true` unless a retained CPU mask says otherwise. Direct RGBA color is returned only in `"rgba"` mode with four retained components.

## See Also

- [createLatticeSpace#dropCPUData](./createlatticespace-dropcpudata.md)
- [createLatticeSpace#mapLinearIndexToCell](./createlatticespace-maplinearindextocell.md)
