# LatticeSpace.getCellRecord

## Summary

`LatticeSpace.getCellRecord()` returns retained values and derived presentation data for one linear cell.

## Syntax

```ts
LatticeSpace.getCellRecord(index: number): LatticeSpaceCellRecord | null
```

## Returns

`LatticeSpaceCellRecord | null` - Spatial index, center, values, derived scalar, optional RGBA color, and activity; or `null` when unavailable.

## Notes

CPU data must be retained. Mask data is optional; without it the returned record is active.

## See Also

- [LatticeSpace.dropCPUData](./wasmgpu-objects-latticespace-dropcpudata.md)
- [LatticeSpace.mapLinearIndexToCell](./wasmgpu-objects-latticespace-maplinearindextocell.md)
