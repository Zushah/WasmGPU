# geometry#positionBuffer

## Summary
geometry#positionBuffer returns the geometry-owned GPU vertex buffer containing packed `float32x3` positions. Access throws before `upload(device)` has created the buffer and after final release.

## Syntax
```ts
Geometry.positionBuffer: GPUBuffer
const value = geometry.positionBuffer;
```

## Returns
The geometry-owned packed-position buffer.

## See Also
- [geometry#destroy](./geometry-destroy.md)
- [geometry#normalBuffer](./geometry-normalbuffer.md)
- [geometry#upload](./geometry-upload.md)
