# geometry#joints1Buffer

## Summary
geometry#joints1Buffer returns the optional second uploaded four-joint-index buffer used for influences five through eight. It is `null` before upload or when `JOINTS_1` is absent, and is owned by the geometry.

## Syntax
```ts
Geometry.joints1Buffer: GPUBuffer | null
const value = geometry.joints1Buffer;
```

## Returns
The geometry-owned secondary joint-index buffer, or `null` when unavailable.

## See Also
- [geometry#isSkinned8](./geometry-isskinned8.md)
- [geometry#jointsBuffer](./geometry-jointsbuffer.md)
- [geometry#weights1Buffer](./geometry-weights1buffer.md)
