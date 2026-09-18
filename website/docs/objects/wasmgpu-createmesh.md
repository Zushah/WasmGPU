# WasmGPU.createMesh

## Summary
WasmGPU.createMesh constructs a renderable mesh by pairing geometry with a material and creating a new transform. The mesh assumes ownership of one existing reference to each resource and releases those references on `destroy()`; the factory does not call `retain()`. Retain shared geometry or materials once for every additional independently owned mesh reference.

## Syntax
```ts
WasmGPU.createMesh(geometry: Geometry, material: Material): Mesh
const result = wgpu.createMesh(geometry, material);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `geometry` | `Geometry` | Yes | Geometry instance that provides vertex/index buffers and bounds. |
| `material` | `Material` | Yes | Material instance that controls shading, blending, and uniforms. |

## Returns
`Mesh` - Unparented mesh with a new transform and one owned reference to each supplied resource.

## See Also
- [createMesh#clone](./createmesh-clone.md)
- [createMesh#destroy](./createmesh-destroy.md)
- [geometry.custom](./geometry-custom.md)
