# createPointCloud#upload

## Summary
createPointCloud#upload makes pending CPU or WebAssembly point and color records available in GPU buffers. After a successful upload, retained CPU snapshots are discarded unless `keepCPUData` is enabled. Call it directly when the buffers are needed before the point cloud is rendered.

## Syntax
```ts
PointCloud.upload(device: GPUDevice, queue: GPUQueue): void
pointCloud.upload(device, queue);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | `GPUDevice` | Yes | Device used to create point and color storage buffers when needed. |
| `queue` | `GPUQueue` | Yes | Queue used to upload point and color records. |

## Returns
`void`

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const device = wgpu.gpu.device;
const queue = wgpu.gpu.queue;
pointCloud.upload(device, queue);
console.log(pointCloud.pointsBuffer !== null); // true
```

## See Also
- [createPointCloud#destroy](./createpointcloud-destroy.md)
- [createPointCloud#dropCPUData](./createpointcloud-dropcpudata.md)
- [createPointCloud#setData](./createpointcloud-setdata.md)
- [createPointCloud#setPointsBuffer](./createpointcloud-setpointsbuffer.md)
