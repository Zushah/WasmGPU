# WasmGPU.webgpu

## Summary
WasmGPU.webgpu provides declarative helpers for WebGPU bind-group layouts and binding resources.
The helpers apply useful defaults, normalize WasmGPU buffer wrappers, and reject invalid or duplicate binding indices.

## Syntax
```ts
WasmGPU.webgpu: WebGPUInterop
```

## Parameters
This accessor does not take parameters.

## Returns
`WebGPUInterop` - Shared, immutable collection of layout and resource normalization helpers. Static and instance accessors return the same helper object.

## Type Details
```ts
type WebGPUInterop = {
    storageBufferLayout: typeof storageBufferLayout;
    uniformBufferLayout: typeof uniformBufferLayout;
    samplerLayout: typeof samplerLayout;
    textureLayout: typeof textureLayout;
    bindGroupLayout: typeof normalizeBindGroupLayout;
    bindingResource: typeof normalizeBindingResource;
    bindGroupResources: typeof normalizeBindGroupResources;
};
```

## Example
```js
const layout = WasmGPU.webgpu.bindGroupLayout({
    entries: [WasmGPU.webgpu.storageBufferLayout({ binding: 0 })]
});
```

## See Also
- [webgpu.storageBufferLayout](./webgpu-storagebufferlayout.md)
- [webgpu.uniformBufferLayout](./webgpu-uniformbufferlayout.md)
- [webgpu.samplerLayout](./webgpu-samplerlayout.md)
- [webgpu.textureLayout](./webgpu-texturelayout.md)
- [webgpu.bindGroupLayout](./webgpu-bindgrouplayout.md)
- [webgpu.bindingResource](./webgpu-bindingresource.md)
- [webgpu.bindGroupResources](./webgpu-bindgroupresources.md)
