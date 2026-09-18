# createLatticeSpace#getLocalBounds

## Summary

`createLatticeSpace#getLocalBounds()` analytically bounds cells in `indexRange` using `origin`, `spacing`, and `cellScale`.

## Syntax

```ts
LatticeSpace.getLocalBounds(): Bounds3
```

## Notes

The result does not inspect cell values or the activity mask. A 2D lattice has zero local Z extent at `origin[2]`; a 3D lattice includes half of the scaled cell size beyond the first and last cell centers on every axis.

## See Also

- [createLatticeSpace#indexRange](./createlatticespace-indexrange.md)
- [createLatticeSpace#getWorldBounds](./createlatticespace-getworldbounds.md)
