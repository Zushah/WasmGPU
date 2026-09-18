# createPointCloud#mapLinearIndexToNd

## Summary
createPointCloud#mapLinearIndexToNd decodes a zero-based linear point index against `ndShape` using row-major ordering (the last dimension changes fastest). It returns `null` when no shape is set, the index is invalid, or the index lies outside the shape's total extent.

## Syntax
```ts
PointCloud.mapLinearIndexToNd(index: number): number[] | null
const result = pointCloud.mapLinearIndexToNd(index);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `index` | `number` | Yes | Non-negative integer linear index. CPU point retention is not required. |

## Returns
`number[] | null` - Decoded coordinate, or `null` when it cannot be mapped.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array(24), ndShape: [2, 3], scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
console.log(pointCloud.mapLinearIndexToNd(4)); // [1, 1]
```

## See Also
- [createPointCloud#ndShape](./createpointcloud-ndshape.md)
