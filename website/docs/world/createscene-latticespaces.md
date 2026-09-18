# createScene#latticeSpaces

## Summary

`createScene#latticeSpaces` returns every `LatticeSpace` attached to the scene, in insertion order. The returned collection includes invisible spaces.

## Syntax

```ts
Scene.latticeSpaces: readonly LatticeSpace[]
const spaces = scene.latticeSpaces;
```

## Returns

`readonly LatticeSpace[]` - The current lattice-space collection. Use scene methods rather than mutating the array.

## See Also

- [createScene#visibleLatticeSpaces](./createscene-visiblelatticespaces.md)
- [createScene#clearLatticeSpaces](./createscene-clearlatticespaces.md)
- [WasmGPU.createLatticeSpace](../objects/wasmgpu-createlatticespace.md)
