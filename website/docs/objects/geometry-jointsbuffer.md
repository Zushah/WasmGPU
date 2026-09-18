# geometry#jointsBuffer

## Summary
geometry#jointsBuffer returns the first uploaded four-joint-index vertex buffer, or `null` before upload or when `JOINTS_0` data is absent. The geometry owns the returned GPU buffer.

## Syntax
```ts
Geometry.jointsBuffer: GPUBuffer | null
const value = geometry.jointsBuffer;
```

## Returns
The geometry-owned primary joint-index buffer, or `null` when unavailable.

## See Also
- [geometry#isIndexed](./geometry-isindexed.md)
- [geometry#isSkinned](./geometry-isskinned.md)
- [geometry#joints1Buffer](./geometry-joints1buffer.md)
- [geometry#weightsBuffer](./geometry-weightsbuffer.md)
