# WasmGPU.material.custom

## Summary
WasmGPU.material.custom creates a caller-WGSL material with an immutable group-1 resource layout. WasmGPU retains its camera/model/global resources in group 0; the declared custom resources occupy group 1.

## Syntax
```ts
WasmGPU.material.custom(descriptor: CustomMaterialDescriptor): CustomMaterial
```

## Type Details
```ts
type CustomMaterialDescriptor = MaterialDescriptor & {
    vertexShader?: string;
    fragmentShader: string;
    bindGroupLayout?: BindGroupLayoutDescriptor;
    resources?: BindGroupResources;
};

type MaterialDescriptor = {
    label?: string;
    blendMode?: BlendMode;
    cullMode?: CullMode;
    depthWrite?: boolean;
    depthTest?: boolean;
};

type BindGroupLayoutDescriptor = {
    label?: string;
    entries: GPUBindGroupLayoutEntry[];
};
```

`resources` may be a binding-indexed record or an array of `{ binding, resource }` entries. Resources can be raw `GPUBuffer`, `StorageBuffer`, `UniformBuffer`, ranged buffer bindings, samplers, texture views, or external textures. Every layout binding must have exactly one initial resource, and duplicate or undeclared bindings are rejected.

The default vertex shader supplies the standard mesh vertex path. The fragment shader and any custom vertex shader must use resources consistently with the immutable layout. An empty layout and resource set are valid. Custom materials do not participate in WasmGPU's built-in instancing, skinning, standard-lighting, or directional-shadow receiver variants.

External resources are borrowed: destroying the material clears its references but does not destroy caller-owned GPU objects. Use `setResource()` to replace resources without changing render-pipeline identity.

## Example
```js
const tint = wgpu.compute.createUniformBuffer({ data: new Float32Array([0.9, 0.7, 0.2, 1]) });
const material = wgpu.material.custom({
    fragmentShader: `
        @group(1) @binding(0) var<uniform> tint: vec4f;
        @fragment fn fs_main() -> @location(0) vec4f { return tint; }
    `,
    bindGroupLayout: {
        entries: [wgpu.webgpu.uniformBufferLayout({ binding: 0, visibility: GPUShaderStage.FRAGMENT })]
    },
    resources: { 0: tint }
});
```

## See Also
- [CustomMaterial.getResource](./custommaterial-getresource.md)
- [CustomMaterial.setResource](./custommaterial-setresource.md)
- [CustomMaterial.getBindGroupEntries](./custommaterial-getbindgroupentries.md)
- [CustomMaterial.createBindGroupLayout](./custommaterial-createbindgrouplayout.md)
- [Material.label](./material-label.md)
- [WasmGPU.webgpu](../interop/wasmgpu-webgpu.md)
