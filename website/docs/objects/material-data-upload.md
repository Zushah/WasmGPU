# material.data#upload

## Summary
material.data#upload creates or updates an owned storage buffer when CPU data is dirty. It is a no-op for a current external buffer or when no change is pending. After transfer, CPU data is released unless retention is enabled; the method does not submit command encoders because it uses buffer creation or `queue.writeBuffer`.

## Syntax
```ts
DataMaterial.upload(device: GPUDevice, queue: GPUQueue): void
material.upload(device, queue);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `device` | `GPUDevice` | Yes | Device that owns a newly created data buffer. |
| `queue` | `GPUQueue` | Yes | Queue used when updating an existing owned data buffer. |

## See Also
- [material.data#dropCPUData](./material-data-dropcpudata.md)
- [material.data#getScaleSourceDescriptor](./material-data-getscalesourcedescriptor.md)
- [material.data#setData](./material-data-setdata.md)
- [material.data#setDataBuffer](./material-data-setdatabuffer.md)
