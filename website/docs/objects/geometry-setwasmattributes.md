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

- [Geometry.setWasmPositions](./geometry-setwasmpositions.md)
- [Geometry.setWasmNormals](./geometry-setwasmnormals.md)
- [Geometry.setWasmTangents](./geometry-setwasmtangents.md)
- [Geometry.setWasmUvs](./geometry-setwasmuvs.md)
- [Geometry.setWasmUvs1](./geometry-setwasmuvs1.md)
- [Geometry.setWasmJoints](./geometry-setwasmjoints.md)
- [Geometry.setWasmWeights](./geometry-setwasmweights.md)
- [Geometry.setWasmJoints1](./geometry-setwasmjoints1.md)
- [Geometry.setWasmWeights1](./geometry-setwasmweights1.md)
- [Geometry.setWasmIndices](./geometry-setwasmindices.md)
- [Geometry.refreshFromWasm](./geometry-refreshfromwasm.md)
- [Geometry.clearWasmSources](./geometry-clearwasmsources.md)
