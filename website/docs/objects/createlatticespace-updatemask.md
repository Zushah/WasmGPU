# createLatticeSpace#updateMask

## Summary

`createLatticeSpace#updateMask()` replaces a contiguous range of retained CPU mask values.

## Syntax

```ts
LatticeSpace.updateMask(mask: Uint32Array, startCell?: number): void
```

## Notes

The lattice must retain CPU mask data, and the update range must fit within `cellCount`.

## See Also

- [createLatticeSpace#setMask](./createlatticespace-setmask.md)
- [createLatticeSpace#markMaskDirty](./createlatticespace-markmaskdirty.md)
