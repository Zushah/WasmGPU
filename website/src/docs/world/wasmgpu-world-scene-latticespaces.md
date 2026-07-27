# Scene.latticeSpaces

## Summary

`Scene.latticeSpaces` returns every `LatticeSpace` attached to the scene, in insertion order. The returned collection includes invisible spaces.

## Syntax

```ts
Scene.latticeSpaces: readonly LatticeSpace[]
const spaces = scene.latticeSpaces;
```

## Returns

`readonly LatticeSpace[]` - The current lattice-space collection. Use scene methods rather than mutating the array.

## See Also

- [Scene.visibleLatticeSpaces](./wasmgpu-world-scene-visiblelatticespaces.md)
- [Scene.clearLatticeSpaces](./wasmgpu-world-scene-clearlatticespaces.md)
- [WasmGPU.createLatticeSpace](../objects/wasmgpu-createlatticespace.md)
