# createPointCloud#maxPointSize

## Summary
createPointCloud#maxPointSize gets or sets the finite maximum rendered point diameter in pixels. It must be nonnegative and at least `minPointSize`. Assignment marks uniforms dirty.

## Syntax
```ts
PointCloud.maxPointSize: number
const value = pointCloud.maxPointSize;
pointCloud.maxPointSize = 24;
```

## Returns
`number` - The stored maximum size. The default is `16`.

## See Also
- [createPointCloud#basePointSize](./createpointcloud-basepointsize.md)
- [createPointCloud#getUniformData](./createpointcloud-getuniformdata.md)
- [createPointCloud#minPointSize](./createpointcloud-minpointsize.md)
