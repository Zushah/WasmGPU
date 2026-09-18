# geometry#upload

## Summary

`geometry#upload()` transfers pending CPU or WebAssembly-backed geometry data into geometry-owned WebGPU buffers.
It transfers only dirty channels on the current device and recreates GPU resources when the device changes. Refresh borrowed Wasm sources after producer writes so their updated active ranges are marked for upload.

## Syntax

```ts
Geometry.upload(device: GPUDevice): void
```

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | `GPUDevice` | Yes | Device that owns the resulting vertex and index buffers. |

## Behavior

Only dirty channels are transferred when the device is unchanged. Passing a different device recreates the geometry's GPU resources for that device. Active WebAssembly views are refreshed and validated immediately before their dirty ranges are copied.

CPU arrays supplied to the geometry are copied into owned GPU buffers. WebAssembly views remain borrowed: uploading never frees or takes ownership of their allocations. Capacity hints supplied by the WebAssembly setters can reserve reusable GPU space without changing `vertexCount` or `indexCount`.

After a WebAssembly producer changes active counts, retained CPU data, or bounds-relevant positions, call the appropriate refresh method before `upload()`. Producer writes within an unchanged active range still require a refresh so the channel is marked dirty.

## Example

```js
geometry.refreshFromWasm({ vertexCount, indexCount, recomputeBounds: true });
geometry.upload(wgpu.gpu.device);

console.log(geometry.positionBuffer, geometry.indexBuffer);
```

## See Also

- [geometry#setWasmAttributes](./geometry-setwasmattributes.md)
- [geometry#refreshFromWasm](./geometry-refreshfromwasm.md)
- [geometry#positionBuffer](./geometry-positionbuffer.md)
- [geometry#indexBuffer](./geometry-indexbuffer.md)
- [geometry#destroy](./geometry-destroy.md)
