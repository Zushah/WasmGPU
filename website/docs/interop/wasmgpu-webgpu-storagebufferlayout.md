# WasmGPU.webgpu.storageBufferLayout

## Summary
WasmGPU.webgpu.storageBufferLayout creates a storage-buffer bind-group layout entry.
Visibility defaults to `GPUShaderStage.COMPUTE`, the buffer type defaults to `"storage"`, and dynamic offsets default to disabled.

## Syntax
```ts
WasmGPU.webgpu.storageBufferLayout(options: StorageBufferBindingLayout): GPUBindGroupLayoutEntry
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `StorageBufferBindingLayout` | Yes | Binding index and optional access, visibility, dynamic-offset, and minimum-size controls. |

## Returns
`GPUBindGroupLayoutEntry` - Storage-buffer entry with compute visibility and writable storage defaults.

## Type Details
```ts
type StorageBufferBindingLayout = {
    binding: number;
    readOnly?: boolean;
    visibility?: GPUShaderStageFlags;
    hasDynamicOffset?: boolean;
    minBindingSize?: number;
};
```

`binding` must be a non-negative integer. Set `readOnly: true` for a `"read-only-storage"` entry.

## Example
```js
const entry = WasmGPU.webgpu.storageBufferLayout({ binding: 0, readOnly: true });
```

## See Also
- [WasmGPU.webgpu](./wasmgpu-webgpu.md)
- [WasmGPU.webgpu.bindGroupLayout](./wasmgpu-webgpu-bindgrouplayout.md)
