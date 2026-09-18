# createPointCloud#dirtyUniforms

## Summary
createPointCloud#dirtyUniforms reports whether packed visual/scale uniform data needs to be consumed again. It starts `true`, becomes true after a relevant property or scale change, and is cleared only by `markUniformsClean()`.

## Syntax
```ts
PointCloud.dirtyUniforms: boolean
const value = pointCloud.dirtyUniforms;
```

## Returns
`true` when the uniform payload needs to be consumed again; otherwise `false`.

## See Also
- [createPointCloud#getUniformData](./createpointcloud-getuniformdata.md)
- [createPointCloud#markUniformsClean](./createpointcloud-markuniformsclean.md)
