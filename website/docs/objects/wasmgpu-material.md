# WasmGPU.material

## Summary
WasmGPU.material is the material factory facade. It creates unlit, physically based standard, data-driven, and caller-WGSL materials for meshes; each returned material owns its managed renderer resources while borrowing explicitly supplied external resources where documented.

Canonical documentation namepaths use `material.*` for directly traversable material factories and `material.*#*` for members of a returned material instance.

## Syntax
```ts
const material = wgpu.material.standard({ color: [0.8, 0.8, 0.8] });
```

## Available APIs
- [material.unlit](./material-unlit.md) creates an unlit material.
- [material.standard](./material-standard.md) creates a physically based material.
- [material.data](./material-data.md) creates a data-driven material with scale and colormap support.
- [material.custom](./material-custom.md) creates a material from caller-authored WGSL and bindings.
- [material#destroy](./material-destroy.md) documents common material lifetime behavior.

## See Also
- [WasmGPU.createMesh](./wasmgpu-createmesh.md)
- [WasmGPU.texture](./wasmgpu-texture.md)
- [WasmGPU.colormap](./wasmgpu-colormap.md)
