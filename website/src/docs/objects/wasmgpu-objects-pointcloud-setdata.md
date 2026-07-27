# PointCloud.setData

## Summary
`PointCloud.setData()` installs packed CPU point records. `setWasmData()` borrows equivalent records from WebAssembly memory, and `refreshWasmData()` explicitly re-reads that source.

## Syntax
```ts
PointCloud.setData(data: Float32Array, opts?: { keepCPUData?: boolean }): void
PointCloud.setWasmData(source: WasmMemoryView<Float32Array> | null, options?: PointCloudWasmDataOptions): void
PointCloud.refreshWasmData(options?: PointCloudWasmRefreshOptions): void
pointCloud.setData(data, opts);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `data` | `Float32Array` | Yes | Packed numeric data consumed by this API. |
| `opts` | `{ keepCPUData?: boolean }` | No | Optional configuration object that customizes behavior for this call. |
| `source` | `WasmMemoryView<Float32Array> \| null` | Yes | Borrowed packed `[x, y, z, scalar]` records, or `null` to detach the source. |
| `options` | `PointCloudWasmDataOptions \| PointCloudWasmRefreshOptions` | No | Active `pointCount`, capacity hint, CPU retention, and optional bounds recomputation. |

## Returns
`void` - No return value. The call applies side effects to runtime state and/or GPU resources.

## Type Details
### WebAssembly source behavior

```ts
type PointCloudWasmRefreshOptions = {
    pointCount?: number;
    keepCPUData?: boolean;
    recomputeBounds?: boolean;
};

type PointCloudWasmDataOptions = PointCloudWasmRefreshOptions & {
    capacity?: number;
};
```

Every source record contains four `f32` values. Setting a source refreshes it immediately; later producer writes or memory growth require `refreshWasmData()` or `refreshFromWasm()`. Upload copies the active range into a point-cloud-owned GPU buffer and never frees borrowed memory.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const data = new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]);
const opts = { keepCPUData: true };
pointCloud.setData(data, opts);
console.log("updated");
```

## See Also
- [PointCloud.setColors](./wasmgpu-objects-pointcloud-setcolors.md)
- [PointCloud.refreshFromWasm](./wasmgpu-objects-pointcloud-refreshfromwasm.md)
- [PointCloud.clearWasmSources](./wasmgpu-objects-pointcloud-clearwasmsources.md)
- [PointCloud.applyScaleStats](./wasmgpu-objects-pointcloud-applyscalestats.md)
- [PointCloud.basePointSize](./wasmgpu-objects-pointcloud-basepointsize.md)
- [PointCloud.colormap](./wasmgpu-objects-pointcloud-colormap.md)
- [PointCloud.colormapStops](./wasmgpu-objects-pointcloud-colormapstops.md)
- [PointCloud.computeBoundsFromCPUData](./wasmgpu-objects-pointcloud-computeboundsfromcpudata.md)
- [PointCloud.destroy](./wasmgpu-objects-pointcloud-destroy.md)
- [PointCloud.dirtyUniforms](./wasmgpu-objects-pointcloud-dirtyuniforms.md)
- [PointCloud.dropCPUData](./wasmgpu-objects-pointcloud-dropcpudata.md)
- [PointCloud.getBounds](./wasmgpu-objects-pointcloud-getbounds.md)
- [PointCloud.getColormapForBinding](./wasmgpu-objects-pointcloud-getcolormapforbinding.md)
- [PointCloud.getColormapKey](./wasmgpu-objects-pointcloud-getcolormapkey.md)
- [PointCloud.getLocalBounds](./wasmgpu-objects-pointcloud-getlocalbounds.md)
