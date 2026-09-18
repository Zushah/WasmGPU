# createPointCloud#getPointRecord

## Summary
createPointCloud#getPointRecord returns a copied CPU-side point record for picking or inspection. It returns `null` when CPU point data is not retained or the index is not an in-range integer. The optional `color` is present only when a CPU color snapshot is retained.

## Syntax
```ts
PointCloud.getPointRecord(index: number): {
    position: [number, number, number];
    scalar: number;
    color: [number, number, number, number] | null;
    packed: [number, number, number, number];
} | null
const record = pointCloud.getPointRecord(index);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `index` | `number` | Yes | Zero-based point index. |

## Returns
The copied point record, or `null` when it is unavailable. `packed` is the original `[x, y, z, scalar]` tuple.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const record = pointCloud.getPointRecord(1);
console.log(record?.packed); // [1, 0, 0, 0.8]
```

## See Also
- [createPointCloud#dropCPUData](./createpointcloud-dropcpudata.md)
- [createPointCloud#setData](./createpointcloud-setdata.md)
- [createPointCloud#setColors](./createpointcloud-setcolors.md)
