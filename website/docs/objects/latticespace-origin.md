# LatticeSpace.origin

## Summary

`LatticeSpace.origin` is the local-space center of cell `[0, 0]` or `[0, 0, 0]`.

## Syntax

```ts
LatticeSpace.origin: [number, number, number]
latticeSpace.origin = [x, y, z];
```

## Notes

All components must be finite. Changing the origin invalidates bounds and occlusion coverage.

## See Also

- [LatticeSpace.spacing](./latticespace-spacing.md)
- [LatticeSpace.getLocalBounds](./latticespace-getlocalbounds.md)
