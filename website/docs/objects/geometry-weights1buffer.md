# geometry#weights1Buffer

## Summary
geometry#weights1Buffer returns the optional second uploaded four-weight buffer used for influences five through eight. It is `null` before upload or when `WEIGHTS_1` is absent, and is owned by the geometry.

## Syntax
```ts
Geometry.weights1Buffer: GPUBuffer | null
const value = geometry.weights1Buffer;
```

## Returns
The geometry-owned secondary weight buffer, or `null` when unavailable.

## See Also
- [geometry#isSkinned8](./geometry-isskinned8.md)
- [geometry#joints1Buffer](./geometry-joints1buffer.md)
- [geometry#jointsBuffer](./geometry-jointsbuffer.md)
