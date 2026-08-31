# WasmGPU.webgpu.bindGroupResources

## Summary
WasmGPU.webgpu.bindGroupResources normalizes a binding record or entry array into `GPUBindGroupEntry[]`.
It validates binding indices, rejects duplicate bindings, and normalizes every resource with `WasmGPU.webgpu.bindingResource`.

## Syntax
```ts
WasmGPU.webgpu.bindGroupResources(resources: BindGroupResources, context?: string): GPUBindGroupEntry[]
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `resources` | `BindGroupResources` | Yes | Binding-indexed record or explicit binding/resource entries. |
| `context` | `string` | No | Error-message prefix; defaults to `"WebGPU bind group resources"`. |

## Returns
`GPUBindGroupEntry[]` - Normalized entries in record-key or input-array order.

## Type Details
```ts
type BindGroupResources =
    | Record<number, BindingResource>
    | ReadonlyArray<{ binding: number; resource: BindingResource }>;
```

Record keys must be canonical non-negative integer strings.

## Example
```js
const entries = WasmGPU.webgpu.bindGroupResources({
    0: storage,
    1: { buffer: uniforms, offset: 0, size: 64 }
});
```

## See Also
- [WasmGPU.webgpu](./wasmgpu-webgpu.md)
- [WasmGPU.webgpu.bindingResource](./wasmgpu-webgpu-bindingresource.md)
- [WasmGPU.compute.ComputePipeline.createBindGroup](../compute/wasmgpu-compute-computepipeline-createbindgroup.md)
