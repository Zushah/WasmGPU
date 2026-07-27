# LatticeSpace.cellScale

## Summary

`LatticeSpace.cellScale` controls each rendered cell's size as a fraction of the axis spacing.

## Syntax

```ts
LatticeSpace.cellScale: [number, number, number]
latticeSpace.cellScale = 0.9;
```

## Notes

Assign a scalar or three components. Each normalized component must be greater than zero and no greater than one; values below one expose gaps.

## See Also

- [LatticeSpace.spacing](./wasmgpu-objects-latticespace-spacing.md)
- [LatticeSpace.getLocalBounds](./wasmgpu-objects-latticespace-getlocalbounds.md)
