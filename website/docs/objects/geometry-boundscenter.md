# geometry#boundsCenter

## Summary
geometry#boundsCenter returns the local-space center of the geometry bounds. The readonly tuple is reused rather than copied; treat it as immutable.

## Syntax
```ts
Geometry.boundsCenter: readonly [number, number, number]
const value = geometry.boundsCenter;
```

## Returns
The reused readonly `[x, y, z]` center tuple.

## See Also
- [geometry#boundsMax](./geometry-boundsmax.md)
- [geometry#boundsMin](./geometry-boundsmin.md)
- [geometry#boundsRadius](./geometry-boundsradius.md)
