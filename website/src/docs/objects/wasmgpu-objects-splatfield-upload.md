# SplatField.upload

## Summary

`SplatField.upload()` realizes pending CPU or WebAssembly data in GPU storage. Managed WebAssembly buffers grow when necessary and are reused when capacity is sufficient.

## Syntax

```ts
SplatField.upload(device: GPUDevice, queue: GPUQueue): void
```

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | `GPUDevice` | Yes | Device used to create managed buffers. |
| `queue` | `GPUQueue` | Yes | Queue used to copy active records. |

## Notes

Upload never frees borrowed WebAssembly memory. CPU arrays are discarded afterward unless `keepCPUData` is enabled.

## See Also

- [SplatField.setWasmPackedData](./wasmgpu-objects-splatfield-setwasmpackeddata.md)
- [SplatField.dropCPUData](./wasmgpu-objects-splatfield-dropcpudata.md)
