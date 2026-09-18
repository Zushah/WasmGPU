# geometry#boundsMax

## Summary
geometry#boundsMax returns the local-space maximum corner used for mesh bounds. The readonly tuple is reused rather than copied; treat it as immutable.

## Syntax
```ts
Geometry.boundsMax: readonly [number, number, number]
const value = geometry.boundsMax;
```

## Returns
The reused readonly `[x, y, z]` maximum-corner tuple.

## See Also
- [geometry#boundsCenter](./geometry-boundscenter.md)
- [geometry#boundsMin](./geometry-boundsmin.md)
- [geometry#boundsRadius](./geometry-boundsradius.md)
