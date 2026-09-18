# createSplatField#upload

## Summary

`createSplatField#upload()` copies pending CPU or WebAssembly-backed splat data into GPU storage owned by the field.
Only active records are copied, borrowed Wasm memory is never freed, and CPU arrays are discarded afterward unless retention is enabled. After producer writes or memory growth, call `refreshFromWasm()` before uploading.

## Syntax

```ts
SplatField.upload(device: GPUDevice, queue: GPUQueue): void
```

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | `GPUDevice` | Yes | Device that owns the uploaded buffers. |
| `queue` | `GPUQueue` | Yes | Queue used to copy active records. |

## Notes

Only active records are copied. Capacity hints supplied by WebAssembly setters can reserve reusable GPU space without changing `splatCount`. Upload never frees borrowed WebAssembly memory. CPU arrays are discarded afterward unless `keepCPUData` is enabled.

After a producer changes WebAssembly records or exported view metadata, call `refreshFromWasm()` before uploading so the active ranges are revalidated and marked for transfer.

## See Also

- [createSplatField#setWasmPackedData](./createsplatfield-setwasmpackeddata.md)
- [createSplatField#refreshFromWasm](./createsplatfield-refreshfromwasm.md)
- [createSplatField#dropCPUData](./createsplatfield-dropcpudata.md)
