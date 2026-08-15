# WasmGPU.createMesh

## Summary
WasmGPU.createMesh constructs a renderable mesh by pairing geometry with a material. Use it as the standard entry point for triangle-mesh scene objects.

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
`Mesh` - Mesh runtime object ready for scene attachment and rendering.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const geometry = wgpu.geometry.box(1, 1, 1);
const material = wgpu.material.unlit({ color: [0.9, 0.6, 0.2], opacity: 1.0 });
const result = wgpu.createMesh(geometry, material);
console.log(result);
```

## See Also
- [WasmGPU.animation.createClip](./wasmgpu-animation-createclip.md)
- [WasmGPU.animation.createPlayer](./wasmgpu-animation-createplayer.md)
- [WasmGPU.animation.createSkin](./wasmgpu-animation-createskin.md)
- [WasmGPU.colormap.builtin](./wasmgpu-colormap-builtin.md)
- [WasmGPU.colormap.fromPalette](./wasmgpu-colormap-frompalette.md)
- [WasmGPU.colormap.fromStops](./wasmgpu-colormap-fromstops.md)
