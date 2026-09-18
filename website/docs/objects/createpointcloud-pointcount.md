# createPointCloud#pointCount

## Summary
createPointCloud#pointCount is the read-only active record count. CPU and Wasm data normally derive it from tuple count; external point buffers require it explicitly. Replacing point data may clear retained CPU colors whose tuple count no longer matches.

## Syntax
```ts
PointCloud.pointCount: number
const value = pointCloud.pointCount;
```

## Returns
The non-negative active point-record count.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const pointCloud = wgpu.createPointCloud({ data: new Float32Array([0, 0, 0, 0.1, 1, 0, 0, 0.8]), scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
console.log(pointCloud.pointCount); // 2
```

## See Also
- [createPointCloud#setData](./createpointcloud-setdata.md)
- [createPointCloud#setPointsBuffer](./createpointcloud-setpointsbuffer.md)
