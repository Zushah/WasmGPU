# WasmGPU.webgpu.bindingResource

## Summary
WasmGPU.webgpu.bindingResource normalizes one declarative binding resource for `GPUDevice.createBindGroup()`.
Raw `GPUBuffer`, `StorageBuffer`, and `UniformBuffer` values become buffer bindings; ranged buffer bindings preserve their optional offset and size. Samplers, texture views, and external textures pass through.

## Syntax
```ts
WasmGPU.webgpu.bindingResource(resource: BindingResource): GPUBindingResource
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `resource` | `BindingResource` | Yes | Raw or wrapped buffer binding, sampler, texture view, or external texture. |

## Returns
`GPUBindingResource` - WebGPU-ready resource. Buffer wrappers become `{ buffer, offset?, size? }`; non-buffer resources pass through.

## Type Details
```ts
type BufferResource = GPUBuffer | StorageBuffer | UniformBuffer;
type BindingResource =
    | BufferResource
    | { buffer: BufferResource; offset?: number; size?: number }
    | GPUSampler
    | GPUTextureView
    | GPUExternalTexture;
```

Offsets must be non-negative integers, and sizes must be positive integers.

## Example
```js
const resource = WasmGPU.webgpu.bindingResource({ buffer: storage, offset: 256, size: 256 });
```

## See Also
- [WasmGPU.webgpu](./wasmgpu-webgpu.md)
- [WasmGPU.webgpu.bindGroupResources](./wasmgpu-webgpu-bindgroupresources.md)
