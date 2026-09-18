# geometry#indexBuffer

## Summary
geometry#indexBuffer returns the geometry-owned `uint32` index buffer after upload, or `null` for non-indexed geometry and before indices have been uploaded. Do not destroy the returned buffer independently of the geometry.

## Syntax
```ts
Geometry.indexBuffer: GPUBuffer | null
const value = geometry.indexBuffer;
```

## Returns
The geometry-owned index buffer, or `null` when unavailable.

## See Also
- [geometry#destroy](./geometry-destroy.md)
- [geometry#isIndexed](./geometry-isindexed.md)
- [geometry#upload](./geometry-upload.md)
