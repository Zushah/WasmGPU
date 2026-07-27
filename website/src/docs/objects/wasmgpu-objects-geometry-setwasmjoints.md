# Geometry.setWasmJoints

## Summary

`Geometry.setWasmJoints()` borrows the first packed four-`u16` joint-index set.

## Syntax

```ts
Geometry.setWasmJoints(source: WasmMemoryView<Uint16Array> | null, options?: GeometryWasmAttributeOptions): void
```

## See Also

- [Geometry.jointsBuffer](./wasmgpu-objects-geometry-jointsbuffer.md)
- [Geometry.setWasmWeights](./wasmgpu-objects-geometry-setwasmweights.md)
