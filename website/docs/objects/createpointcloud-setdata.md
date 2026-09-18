# createPointCloud#setData

## Summary
`createPointCloud#setData()` installs packed CPU point records and derives `pointCount`. It retains the supplied array itself rather than copying it, detaches any WebAssembly point source, and clears automatically computed bounds while preserving explicit bounds. `setWasmData()` borrows equivalent records, and `refreshWasmData()` re-reads that source after producer writes or WebAssembly memory growth.

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
| `data` | `Float32Array` | Yes | Packed `[x, y, z, scalar]` records; length must be a multiple of four. |
| `opts` | `{ keepCPUData?: boolean }` | No | Overrides whether the CPU point array remains available after upload. |
| `source` | `WasmMemoryView<Float32Array> \| null` | Yes | Borrowed packed `[x, y, z, scalar]` records, or `null` to detach the source. |
| `options` | `PointCloudWasmDataOptions \| PointCloudWasmRefreshOptions` | No | Active `pointCount`, capacity hint, CPU retention, and optional bounds recomputation. |

## Returns
`void`

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

Every source record contains four `f32` values. Setting a source refreshes it immediately; later producer writes or memory growth require `refreshWasmData()` or `refreshFromWasm()`. An explicit `pointCount` selects an active prefix; otherwise the source length must be divisible by four and determines the count. `capacity` is measured in records and controls grow-only managed GPU allocation. Upload copies the active range into a cloud-owned GPU buffer and never frees borrowed Wasm memory.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
const data = new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]);
const opts = { keepCPUData: true };
pointCloud.setData(data, opts);
console.log(pointCloud.getPointRecord(1)?.position); // [1, 0, 0]
```

## See Also
- [createPointCloud#setColors](./createpointcloud-setcolors.md)
- [createPointCloud#refreshFromWasm](./createpointcloud-refreshfromwasm.md)
- [createPointCloud#clearWasmSources](./createpointcloud-clearwasmsources.md)
- [createPointCloud#computeBoundsFromCPUData](./createpointcloud-computeboundsfromcpudata.md)
- [createPointCloud#dropCPUData](./createpointcloud-dropcpudata.md)
- [createPointCloud#getPointRecord](./createpointcloud-getpointrecord.md)
- [createPointCloud#upload](./createpointcloud-upload.md)
