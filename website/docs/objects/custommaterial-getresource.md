# CustomMaterial.getResource

## Summary
CustomMaterial.getResource returns the resource currently assigned to a declared group-1 binding.

## Syntax
```ts
CustomMaterial.getResource(binding: number): BindingResource | undefined
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `binding` | `number` | Yes | Group-1 binding number to inspect. |

## Returns
`BindingResource | undefined` - The assigned resource, or `undefined` when no resource is present at that binding.

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

The method requires a live material. Buffer-binding objects are returned as snapshots so changing the returned record does not mutate the material; the underlying WebGPU objects remain shared and caller-owned.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const device = wgpu.gpu.device;
const fragmentShader = `
  @group(1) @binding(0) var customSampler: sampler;
  @fragment fn fs_main() -> @location(0) vec4f { return vec4f(1); }
`;
const sampler = device.createSampler({ magFilter: "linear" });
const material = wgpu.material.custom({
  fragmentShader,
  bindGroupLayout: {
    entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} }],
  },
  resources: { 0: sampler },
});

console.log(material.getResource(0) === sampler); // true
console.log(material.getResource(7)); // undefined
```

## Notes
Ranged buffer-binding records are returned as snapshots. External buffers, samplers, and views remain caller-owned.

## See Also
- [CustomMaterial.setResource](./custommaterial-setresource.md)
- [CustomMaterial.getBindGroupEntries](./custommaterial-getbindgroupentries.md)
- [WasmGPU.material.custom](./wasmgpu-material-custom.md)
