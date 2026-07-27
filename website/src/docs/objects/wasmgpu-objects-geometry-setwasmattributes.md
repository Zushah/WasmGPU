# Geometry.setWasmAttributes

## Summary

`Geometry.setWasmAttributes()` updates several borrowed vertex and index sources as one operation.

## Syntax

```ts
Geometry.setWasmAttributes(sources: GeometryWasmSources, options?: GeometryWasmAttributeSetOptions): void
```

## Notes

Source keys are `positions`, `normals`, `tangents`, `uvs`, `uvs1`, `joints`, `weights`, `joints1`, `weights1`, and `indices`; explicit `null` detaches a channel. CPU and WebAssembly sources are mutually exclusive per attribute.

## See Also

- [Geometry.setWasmPositions](./wasmgpu-objects-geometry-setwasmpositions.md)
- [Geometry.setWasmNormals](./wasmgpu-objects-geometry-setwasmnormals.md)
- [Geometry.setWasmTangents](./wasmgpu-objects-geometry-setwasmtangents.md)
- [Geometry.setWasmUvs](./wasmgpu-objects-geometry-setwasmuvs.md)
- [Geometry.setWasmUvs1](./wasmgpu-objects-geometry-setwasmuvs1.md)
- [Geometry.setWasmJoints](./wasmgpu-objects-geometry-setwasmjoints.md)
- [Geometry.setWasmWeights](./wasmgpu-objects-geometry-setwasmweights.md)
- [Geometry.setWasmJoints1](./wasmgpu-objects-geometry-setwasmjoints1.md)
- [Geometry.setWasmWeights1](./wasmgpu-objects-geometry-setwasmweights1.md)
- [Geometry.setWasmIndices](./wasmgpu-objects-geometry-setwasmindices.md)
- [Geometry.refreshFromWasm](./wasmgpu-objects-geometry-refreshfromwasm.md)
- [Geometry.clearWasmSources](./wasmgpu-objects-geometry-clearwasmsources.md)
