# createLatticeSpace#applyScaleStats

## Summary

`createLatticeSpace#applyScaleStats()` updates the current scale transform from computed statistics. Finite `min` and `max` values replace the scale domain; when both percentile bounds are non-null, they replace the clamp range.

## Syntax

```ts
LatticeSpace.applyScaleStats(stats: ScaleStatsResult): void
```

## Notes

Statistics must correspond to the lattice's current data. Callers managing asynchronous requests must discard stale results after the underlying data changes. Applying statistics marks uniforms dirty and emits a `"scale"` visual-change event.

## See Also

- [createLatticeSpace#getScaleSourceDescriptor](./createlatticespace-getscalesourcedescriptor.md)
- [createLatticeSpace#scaleTransform](./createlatticespace-scaletransform.md)
