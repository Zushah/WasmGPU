# WasmGPU.geometry

## Summary
WasmGPU.geometry is the geometry factory facade. It creates custom vertex/index geometry and built-in primitives, curves, and surfaces; the returned `Geometry` objects can be reused by one or more meshes and follow their own reference-counted lifetime.

Canonical documentation namepaths use `geometry.*` for directly traversable factories and `geometry#*` for members of a returned geometry instance.

## Syntax
```ts
const geometry = wgpu.geometry.box(1, 1, 1);
```

## Available APIs
- [geometry.custom](./geometry-custom.md) creates geometry from a descriptor.
- [geometry.box](./geometry-box.md), [geometry.sphere](./geometry-sphere.md), and [geometry.plane](./geometry-plane.md) create common primitives.
- [geometry.cartesianCurve](./geometry-cartesiancurve.md) and [geometry.parametricSurface](./geometry-parametricsurface.md) create sampled geometry.
- [geometry#upload](./geometry-upload.md) uploads a returned geometry's active CPU or WebAssembly-backed data.

## See Also
- [WasmGPU.createMesh](./wasmgpu-createmesh.md)
- [geometry#destroy](./geometry-destroy.md)
- [WasmGPU.material](./wasmgpu-material.md)
