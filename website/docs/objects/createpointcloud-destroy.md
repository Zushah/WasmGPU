# createPointCloud#destroy

## Summary
`createPointCloud#destroy` releases its transform, uniform buffer, retained records, Wasm-source references, and point/color buffers it owns. Caller-supplied buffers are destroyed only when ownership was transferred with descriptor `ownBuffers: true` or setter option `ownBuffer: true`; borrowed buffers are detached.

## Syntax
```ts
PointCloud.destroy(): void
pointCloud.destroy();
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
pointCloud.destroy();
console.log(pointCloud.pointsBuffer, pointCloud.colorsBuffer); // null, null
```

## See Also
- [createPointCloud#dropCPUData](./createpointcloud-dropcpudata.md)
- [createPointCloud#setColorsBuffer](./createpointcloud-setcolorsbuffer.md)
- [createPointCloud#setPointsBuffer](./createpointcloud-setpointsbuffer.md)
