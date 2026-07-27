# Scene.traverseLatticeSpaces

## Summary

`Scene.traverseLatticeSpaces()` visits every attached lattice space in insertion order, including invisible spaces.

## Syntax

```ts
Scene.traverseLatticeSpaces(callback: (latticeSpace: LatticeSpace) => void): void
```

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `callback` | `(latticeSpace: LatticeSpace) => void` | Yes | Function invoked once for each space. |

## Returns

`void`

## See Also

- [Scene.traverseVisibleLatticeSpaces](./wasmgpu-world-scene-traversevisiblelatticespaces.md)
- [Scene.latticeSpaces](./wasmgpu-world-scene-latticespaces.md)
