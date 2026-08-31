# WasmGPU.webgpu.textureLayout

## Summary
WasmGPU.webgpu.textureLayout creates a sampled-texture bind-group layout entry.
It defaults to fragment visibility, `"float"` samples, a `"2d"` view, and a non-multisampled texture.

## Syntax
```ts
WasmGPU.webgpu.textureLayout(options: TextureBindingLayout): GPUBindGroupLayoutEntry
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `TextureBindingLayout` | Yes | Binding index and sampled-texture visibility, type, dimension, and multisampling controls. |

## Returns
`GPUBindGroupLayoutEntry` - Sampled-texture entry with fragment/float/2D/non-multisampled defaults.

## Type Details
```ts
type TextureBindingLayout = {
    binding: number;
    visibility?: GPUShaderStageFlags;
    sampleType?: GPUTextureSampleType;
    viewDimension?: GPUTextureViewDimension;
    multisampled?: boolean;
};
```

## Example
```js
const entry = WasmGPU.webgpu.textureLayout({ binding: 3, viewDimension: "cube" });
```

## See Also
- [WasmGPU.webgpu](./wasmgpu-webgpu.md)
- [WasmGPU.webgpu.bindGroupLayout](./wasmgpu-webgpu-bindgrouplayout.md)
