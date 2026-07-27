# Scene.findAllLatticeSpacesByName

## Summary

`Scene.findAllLatticeSpacesByName()` returns every attached lattice space whose `name` exactly matches the requested string.

## Syntax

```ts
Scene.findAllLatticeSpacesByName(name: string): LatticeSpace[]
```

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Exact space name to find. |

## Returns

`LatticeSpace[]` - Matching spaces in insertion order; the array is empty when nothing matches.

## See Also

- [Scene.findLatticeSpaceByName](./wasmgpu-world-scene-findlatticespacebyname.md)
- [Scene.latticeSpaces](./wasmgpu-world-scene-latticespaces.md)
