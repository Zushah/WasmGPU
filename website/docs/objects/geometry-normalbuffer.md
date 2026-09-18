# geometry#normalBuffer

## Summary
geometry#normalBuffer returns the geometry-owned GPU vertex buffer containing packed `float32x3` normals. Access throws before `upload(device)` has created the buffer and after final release; geometry without supplied normals uploads default normal data.

## Syntax
```ts
Geometry.normalBuffer: GPUBuffer
const value = geometry.normalBuffer;
```

## Returns
The geometry-owned packed-normal buffer.

## See Also
- [geometry#destroy](./geometry-destroy.md)
- [geometry#positionBuffer](./geometry-positionbuffer.md)
- [geometry#upload](./geometry-upload.md)
