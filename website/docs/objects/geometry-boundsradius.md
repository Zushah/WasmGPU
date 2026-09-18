# geometry#boundsRadius

## Summary
geometry#boundsRadius is the local-space bounding-sphere radius associated with `boundsCenter`. It is derived from positions unless explicit bounds were supplied in the geometry descriptor.

## Syntax
```ts
Geometry.boundsRadius: number
const value = geometry.boundsRadius;
```

## Returns
The local-space bounding-sphere radius.

## See Also
- [geometry#boundsCenter](./geometry-boundscenter.md)
- [geometry#boundsMax](./geometry-boundsmax.md)
- [geometry#boundsMin](./geometry-boundsmin.md)
