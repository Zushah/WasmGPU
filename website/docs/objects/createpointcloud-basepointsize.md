# createPointCloud#basePointSize

## Summary
createPointCloud#basePointSize gets or sets the finite, nonnegative nominal point diameter in pixels. Assignment marks the point-cloud uniforms dirty.

## Syntax
```ts
PointCloud.basePointSize: number
const value = pointCloud.basePointSize;
pointCloud.basePointSize = 6;
```

## Returns
`number` - Current base size. The default is `2`.

## See Also
- [createPointCloud#dirtyUniforms](./createpointcloud-dirtyuniforms.md)
- [createPointCloud#getUniformData](./createpointcloud-getuniformdata.md)
- [createPointCloud#minPointSize](./createpointcloud-minpointsize.md)
- [createPointCloud#maxPointSize](./createpointcloud-maxpointsize.md)
