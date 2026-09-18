# createPointCloud#sizeAttenuation

## Summary
createPointCloud#sizeAttenuation gets or sets the finite, nonnegative distance-scaling numerator for point size. A value of zero disables attenuation; positive values render `basePointSize * sizeAttenuation / distance` before min/max clamping. Assignment marks uniforms dirty.

## Syntax
```ts
PointCloud.sizeAttenuation: number
const value = pointCloud.sizeAttenuation;
pointCloud.sizeAttenuation = 0;
```

## Returns
`number` - The stored attenuation. The default is `1`.

## See Also
- [createPointCloud#basePointSize](./createpointcloud-basepointsize.md)
- [createPointCloud#getUniformData](./createpointcloud-getuniformdata.md)
