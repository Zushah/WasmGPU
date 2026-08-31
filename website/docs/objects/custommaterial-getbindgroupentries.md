# CustomMaterial.getBindGroupEntries

## Summary
CustomMaterial.getBindGroupEntries validates and converts every declared custom-material resource into WebGPU bind-group entries.

## Syntax
```ts
CustomMaterial.getBindGroupEntries(): GPUBindGroupEntry[]
```

## Parameters
This method does not take parameters.

## Returns
`GPUBindGroupEntry[]` - One normalized entry for every binding in the material's immutable group-1 layout, in layout-entry order.

## Type Details
```ts
type GPUBindGroupEntry = {
    binding: number;
    resource: GPUBindingResource;
};
```

The material must still be alive, and every declared binding must have a resource. Buffer wrappers are normalized into WebGPU buffer-binding records; samplers, texture views, and external textures are forwarded as their corresponding WebGPU resources.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const device = wgpu.gpu.device;
const fragmentShader = `
  @group(1) @binding(0) var customSampler: sampler;
  @fragment fn fs_main() -> @location(0) vec4f { return vec4f(1); }
`;
const material = wgpu.material.custom({
  fragmentShader,
  bindGroupLayout: {
    entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} }],
  },
  resources: { 0: device.createSampler() },
});

const entries = material.getBindGroupEntries();
const bindGroup = device.createBindGroup({
  layout: material.createBindGroupLayout(device),
  entries,
});
```

## Notes
The call throws if a declared binding has no resource. Returned entries are ready for the material's group-1 bind-group layout.

## See Also
- [CustomMaterial.createBindGroupLayout](./custommaterial-createbindgrouplayout.md)
- [CustomMaterial.setResource](./custommaterial-setresource.md)
- [WasmGPU.material.custom](./wasmgpu-material-custom.md)
