# WasmGPU.webgpu.uniformBufferLayout

## Summary
WasmGPU.webgpu.uniformBufferLayout creates a uniform-buffer bind-group layout entry.
Visibility defaults to `GPUShaderStage.COMPUTE`, and dynamic offsets default to disabled.

## Syntax
```ts
WasmGPU.webgpu.uniformBufferLayout(options: UniformBufferBindingLayout): GPUBindGroupLayoutEntry
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `UniformBufferBindingLayout` | Yes | Binding index and optional visibility, dynamic-offset, and minimum-size controls. |

## Returns
`GPUBindGroupLayoutEntry` - Uniform-buffer entry with compute visibility and disabled dynamic offsets by default.

## Type Details
```ts
type UniformBufferBindingLayout = {
    binding: number;
    visibility?: GPUShaderStageFlags;
    hasDynamicOffset?: boolean;
    minBindingSize?: number;
};
```

`binding` must be a non-negative integer.

## Example
```js
const entry = WasmGPU.webgpu.uniformBufferLayout({ binding: 1 });
```

## See Also
- [WasmGPU.webgpu](./wasmgpu-webgpu.md)
- [WasmGPU.webgpu.bindGroupLayout](./wasmgpu-webgpu-bindgrouplayout.md)
