# webgpu.bindGroupLayout

## Summary
webgpu.bindGroupLayout validates and clones a declarative bind-group layout.
Bindings must be unique non-negative integers, and every entry must define exactly one WebGPU resource layout.

## Syntax
```ts
WasmGPU.webgpu.bindGroupLayout(descriptor: BindGroupLayoutDescriptor, context?: string): BindGroupLayoutDescriptor
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `BindGroupLayoutDescriptor` | Yes | Label and WebGPU layout entries to validate and clone. |
| `context` | `string` | No | Error-message prefix; defaults to `"WebGPU bind group layout"`. |

## Returns
`BindGroupLayoutDescriptor` - New descriptor with cloned entries and nested resource-layout records.

## Type Details
```ts
type BindGroupLayoutDescriptor = {
    label?: string;
    entries: GPUBindGroupLayoutEntry[];
};
```

## Example
```js
const layout = WasmGPU.webgpu.bindGroupLayout({
    label: "simulation",
    entries: [WasmGPU.webgpu.storageBufferLayout({ binding: 0 })]
});
```

## See Also
- [WasmGPU.webgpu](./wasmgpu-webgpu.md)
- [compute.createPipeline](../compute/compute-createpipeline.md)
- [webgpu.bindGroupResources](./webgpu-bindgroupresources.md)
