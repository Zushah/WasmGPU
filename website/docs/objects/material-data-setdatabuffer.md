# material.data#setDataBuffer

## Summary
material.data#setDataBuffer selects an external `GPUBuffer` as the data source, drops the CPU array, and derives record count from `buffer.size`, stride, and offset. The buffer is borrowed: replacing or destroying the material does not destroy it. The caller must provide storage-buffer usage and keep it alive while used.

## Syntax
```ts
DataMaterial.setDataBuffer(buffer: GPUBuffer): void
material.setDataBuffer(buffer);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `buffer` | `GPUBuffer` | Yes | Borrowed buffer with `GPUBufferUsage.STORAGE`; its size must cover complete records for the active transform layout. |

## See Also
- [material.data#getScaleSourceDescriptor](./material-data-getscalesourcedescriptor.md)
- [material.data#setData](./material-data-setdata.md)
- [material.data#upload](./material-data-upload.md)
