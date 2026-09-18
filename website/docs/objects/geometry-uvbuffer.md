# geometry#uvBuffer

## Summary
geometry#uvBuffer returns the geometry-owned GPU vertex buffer containing packed primary `float32x2` texture coordinates. Access throws before `upload(device)` has created the buffer and after final release; missing UVs are represented by uploaded defaults.

## Syntax
```ts
Geometry.uvBuffer: GPUBuffer
const value = geometry.uvBuffer;
```

## Returns
The geometry-owned packed primary-UV buffer.

## See Also
- [geometry#destroy](./geometry-destroy.md)
- [geometry#upload](./geometry-upload.md)
