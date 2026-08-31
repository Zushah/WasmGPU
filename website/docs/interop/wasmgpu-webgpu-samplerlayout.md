# WasmGPU.webgpu.samplerLayout

## Summary
WasmGPU.webgpu.samplerLayout creates a sampler bind-group layout entry.
Visibility defaults to `GPUShaderStage.FRAGMENT`, and sampler type defaults to `"filtering"`.

## Syntax
```ts
WasmGPU.webgpu.samplerLayout(options: SamplerBindingLayout): GPUBindGroupLayoutEntry
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `SamplerBindingLayout` | Yes | Binding index, shader visibility, and sampler binding type. |

## Returns
`GPUBindGroupLayoutEntry` - Sampler entry with fragment visibility and `"filtering"` type defaults.

## Type Details
```ts
type SamplerBindingLayout = {
    binding: number;
    visibility?: GPUShaderStageFlags;
    type?: GPUSamplerBindingType;
};
```

## Example
```js
const entry = WasmGPU.webgpu.samplerLayout({ binding: 2, type: "comparison" });
```

## See Also
- [WasmGPU.webgpu](./wasmgpu-webgpu.md)
- [WasmGPU.webgpu.bindGroupLayout](./wasmgpu-webgpu-bindgrouplayout.md)
