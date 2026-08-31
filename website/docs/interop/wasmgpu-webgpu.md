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
- [WasmGPU.webgpu.storageBufferLayout](./wasmgpu-webgpu-storagebufferlayout.md)
- [WasmGPU.webgpu.uniformBufferLayout](./wasmgpu-webgpu-uniformbufferlayout.md)
- [WasmGPU.webgpu.samplerLayout](./wasmgpu-webgpu-samplerlayout.md)
- [WasmGPU.webgpu.textureLayout](./wasmgpu-webgpu-texturelayout.md)
- [WasmGPU.webgpu.bindGroupLayout](./wasmgpu-webgpu-bindgrouplayout.md)
- [WasmGPU.webgpu.bindingResource](./wasmgpu-webgpu-bindingresource.md)
- [WasmGPU.webgpu.bindGroupResources](./wasmgpu-webgpu-bindgroupresources.md)
