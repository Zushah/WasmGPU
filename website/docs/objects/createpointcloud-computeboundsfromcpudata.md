# createPointCloud#computeBoundsFromCPUData

## Summary
createPointCloud#computeBoundsFromCPUData computes local-space box and sphere bounds from retained `[x, y, z, scalar]` records. It is a no-op when no CPU point snapshot exists or the cloud is empty. Successful computation replaces even previously explicit bounds with computed bounds.

## Syntax
```ts
PointCloud.computeBoundsFromCPUData(): void
pointCloud.computeBoundsFromCPUData();
```

## Parameters
None.

## Returns
`void`

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
pointCloud.computeBoundsFromCPUData();
console.log(pointCloud.getLocalBounds().boxMax); // [1, 0, 0]
```

## See Also
- [createPointCloud#dropCPUData](./createpointcloud-dropcpudata.md)
- [createPointCloud#getBounds](./createpointcloud-getbounds.md)
- [createPointCloud#getLocalBounds](./createpointcloud-getlocalbounds.md)
- [createPointCloud#setData](./createpointcloud-setdata.md)
