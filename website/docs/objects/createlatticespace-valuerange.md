# createLatticeSpace#valueRange

## Summary

`createLatticeSpace#valueRange` optionally limits scalar rendering to an inclusive value interval.

## Syntax

```ts
LatticeSpace.valueRange: [number, number] | null
```

## Notes

In scalar color mode, cells whose selected scalar lies below the minimum or above the maximum are discarded. Colormap normalization remains controlled by `scaleTransform`. Assign `null` to disable this visibility filter. Both bounds must be finite and ascending; the getter returns a copy.

## See Also

- [createLatticeSpace#scaleTransform](./createlatticespace-scaletransform.md)
- [createLatticeSpace#colormap](./createlatticespace-colormap.md)
