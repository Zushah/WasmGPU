# LatticeSpace.getScaleSourceDescriptor

## Summary

`LatticeSpace.getScaleSourceDescriptor()` describes the current GPU cell-data buffer for scale-statistics computation.

## Syntax

```ts
LatticeSpace.getScaleSourceDescriptor(revision?: number): ScaleSourceDescriptor | null
```

## Returns

`ScaleSourceDescriptor | null` - A GPU source descriptor, or `null` when no data buffer exists, the cell count is zero, or solid-color mode is active.

## See Also

- [LatticeSpace.applyScaleStats](./wasmgpu-objects-latticespace-applyscalestats.md)
- [LatticeSpace.setData](./wasmgpu-objects-latticespace-setdata.md)
