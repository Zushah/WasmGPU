# createPointCloud#minPointSize

## Summary
createPointCloud#minPointSize gets or sets the finite, nonnegative minimum rendered point diameter in pixels. Assignment marks uniforms dirty.

## Syntax
```ts
PointCloud.minPointSize: number
const value = pointCloud.minPointSize;
pointCloud.minPointSize = 2;
```

## Returns
`number` - The stored minimum size. The default is `1`.

## See Also
- [createPointCloud#basePointSize](./createpointcloud-basepointsize.md)
- [createPointCloud#getUniformData](./createpointcloud-getuniformdata.md)
- [createPointCloud#maxPointSize](./createpointcloud-maxpointsize.md)
