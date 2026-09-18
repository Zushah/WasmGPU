# createPointCloud#softness

## Summary
createPointCloud#softness gets or sets a value reserved for point-edge softness. The value is stored, marks uniforms dirty, and is packed after clamping to `[0, 1]`, but it currently has no supported visual effect. Do not rely on it to change point falloff.

## Syntax
```ts
PointCloud.softness: number
const value = pointCloud.softness;
pointCloud.softness = 0.25;
```

## Returns
`number` - The stored softness. The default is `0.15`.

## See Also
- [createPointCloud#dirtyUniforms](./createpointcloud-dirtyuniforms.md)
- [createPointCloud#getUniformData](./createpointcloud-getuniformdata.md)
