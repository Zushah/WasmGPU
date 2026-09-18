# createLatticeSpace#getScaleSourceDescriptor

## Summary

`createLatticeSpace#getScaleSourceDescriptor()` describes the current GPU cell-data buffer for scale-statistics computation.
It returns `null` when no data buffer exists, the lattice is empty, or solid-color mode makes scalar statistics unnecessary.

## Syntax

```ts
LatticeSpace.getScaleSourceDescriptor(revision?: number): ScaleSourceDescriptor | null
```

## Returns

`ScaleSourceDescriptor | null` - A GPU source descriptor, or `null` when no data buffer exists, the cell count is zero, or solid-color mode is active.

## See Also

- [createLatticeSpace#applyScaleStats](./createlatticespace-applyscalestats.md)
- [createLatticeSpace#setData](./createlatticespace-setdata.md)
