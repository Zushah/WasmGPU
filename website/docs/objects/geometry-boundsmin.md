# geometry#boundsMin

## Summary
geometry#boundsMin returns the local-space minimum corner used for mesh bounds. The readonly tuple is reused rather than copied; treat it as immutable.

## Syntax
```ts
Geometry.boundsMin: readonly [number, number, number]
const value = geometry.boundsMin;
```

## Returns
The reused readonly `[x, y, z]` minimum-corner tuple.

## See Also
- [geometry#boundsCenter](./geometry-boundscenter.md)
- [geometry#boundsMax](./geometry-boundsmax.md)
- [geometry#boundsRadius](./geometry-boundsradius.md)
