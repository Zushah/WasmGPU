# LatticeSpace.updateMask

## Summary

`LatticeSpace.updateMask()` replaces a contiguous range of retained CPU mask values.

## Syntax

```ts
LatticeSpace.updateMask(mask: Uint32Array, startCell?: number): void
```

## Notes

The lattice must retain CPU mask data, and the update range must fit within `cellCount`.

## See Also

- [LatticeSpace.setMask](./latticespace-setmask.md)
- [LatticeSpace.markMaskDirty](./latticespace-markmaskdirty.md)
