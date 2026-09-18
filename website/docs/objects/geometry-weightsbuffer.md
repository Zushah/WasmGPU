# geometry#weightsBuffer

## Summary
geometry#weightsBuffer returns the first uploaded four-weight vertex buffer, or `null` before upload or when `WEIGHTS_0` data is absent. The geometry owns the returned GPU buffer.

## Syntax
```ts
Geometry.weightsBuffer: GPUBuffer | null
const value = geometry.weightsBuffer;
```

## Returns
The geometry-owned primary weight buffer, or `null` when unavailable.

## See Also
- [geometry#isSkinned](./geometry-isskinned.md)
- [geometry#jointsBuffer](./geometry-jointsbuffer.md)
