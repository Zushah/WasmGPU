# createPointCloud#markUniformsClean

## Summary
createPointCloud#markUniformsClean clears only the visual/scale uniform dirty flag. It does not upload point or color data. Custom integrations can call it after consuming `getUniformData()`.

## Syntax
```ts
PointCloud.markUniformsClean(): void
pointCloud.markUniformsClean();
```

## Parameters
None.

## Returns
`void`

## See Also
- [createPointCloud#dirtyUniforms](./createpointcloud-dirtyuniforms.md)
- [createPointCloud#getUniformData](./createpointcloud-getuniformdata.md)
