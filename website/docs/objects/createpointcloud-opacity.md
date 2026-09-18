# createPointCloud#opacity

## Summary
createPointCloud#opacity gets or sets the global alpha multiplier. Assignment marks uniforms dirty. The stored value is unrestricted, but the GPU uniform clamps it to `[0, 1]` before multiplying per-point alpha.

## Syntax
```ts
PointCloud.opacity: number
const value = pointCloud.opacity;
pointCloud.opacity = 0.5;
```

## Returns
`number` - The stored opacity. The default is `1`.

## See Also
- [createPointCloud#dirtyUniforms](./createpointcloud-dirtyuniforms.md)
- [createPointCloud#getUniformData](./createpointcloud-getuniformdata.md)
