# createPointCloud#getUniformBufferSize

## Summary
createPointCloud#getUniformBufferSize returns the fixed byte size required for this cloud's uniform buffer: `240` bytes (`60` `f32` values).

## Syntax
```ts
PointCloud.getUniformBufferSize(): number
const result = pointCloud.getUniformBufferSize();
```

## Returns
`240`

## See Also
- [createPointCloud#getUniformData](./createpointcloud-getuniformdata.md)
