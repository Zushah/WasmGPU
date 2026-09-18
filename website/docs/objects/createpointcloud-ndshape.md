# createPointCloud#ndShape

## Summary
createPointCloud#ndShape gets or sets the optional logical shape used to decode picked linear indices. Every dimension must be a positive signed 32-bit integer. Both assignment and retrieval copy the array, and assigning `null` or an empty array clears the shape. The shape is not required to multiply to `pointCount`.

## Syntax
```ts
PointCloud.ndShape: number[] | null
const value = pointCloud.ndShape;
pointCloud.ndShape = [128, 256];
```

## Returns
`number[] | null` - Copied logical shape, or `null` when no shape is assigned.

## See Also
- [createPointCloud#mapLinearIndexToNd](./createpointcloud-maplinearindextond.md)
- [createPointCloud#pointCount](./createpointcloud-pointcount.md)
