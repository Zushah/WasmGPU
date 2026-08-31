# CustomMaterial.setResource

## Summary
CustomMaterial.setResource replaces a resource at an existing binding and invalidates the material bind group without changing its pipeline layout.

## Syntax
```ts
CustomMaterial.setResource(binding: number, resource: BindingResource): void
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `binding` | `number` | Yes | Existing group-1 binding number to update. |
| `resource` | `BindingResource` | Yes | Buffer, buffer range, sampler, texture view, or external texture compatible with the declared layout entry. |

## Returns
`void`

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

The binding number must already exist in the immutable layout. A successful replacement clears the cached bind group and bind-group key so the renderer rebuilds them on demand. Buffer range records are snapshotted, while their WebGPU resources remain caller-owned.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const device = wgpu.gpu.device;
const fragmentShader = `
  @group(1) @binding(0) var customSampler: sampler;
  @fragment fn fs_main() -> @location(0) vec4f { return vec4f(1); }
`;
const nearest = device.createSampler({ magFilter: "nearest" });
const linear = device.createSampler({ magFilter: "linear" });
const material = wgpu.material.custom({
  fragmentShader,
  bindGroupLayout: {
    entries: [{ binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {} }],
  },
  resources: { 0: nearest },
});

material.setResource(0, linear);
```

## Notes
The binding must appear in the immutable `bindGroupLayout` supplied at construction. The material borrows external resources and does not destroy them.

## See Also
- [CustomMaterial.getResource](./custommaterial-getresource.md)
- [CustomMaterial.getBindGroupEntries](./custommaterial-getbindgroupentries.md)
- [WasmGPU.webgpu.bindingResource](../interop/wasmgpu-webgpu-bindingresource.md)
