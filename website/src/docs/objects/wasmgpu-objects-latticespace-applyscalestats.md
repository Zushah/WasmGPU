# LatticeSpace.applyScaleStats

## Summary

`LatticeSpace.applyScaleStats()` applies asynchronously computed statistics to the current scale transform.

## Syntax

```ts
LatticeSpace.applyScaleStats(stats: ScaleStatsResult): void
```

## Notes

Stale statistics are ignored when their revision no longer matches the lattice's scale source.

## See Also

- [LatticeSpace.getScaleSourceDescriptor](./wasmgpu-objects-latticespace-getscalesourcedescriptor.md)
- [LatticeSpace.scaleTransform](./wasmgpu-objects-latticespace-scaletransform.md)
