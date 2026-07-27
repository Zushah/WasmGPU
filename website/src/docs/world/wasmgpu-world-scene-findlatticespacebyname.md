# Scene.findLatticeSpaceByName

## Summary

`Scene.findLatticeSpaceByName()` returns the first attached lattice space whose `name` exactly matches the requested string.

## Syntax

```ts
Scene.findLatticeSpaceByName(name: string): LatticeSpace | undefined
```

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Exact space name to find. |

## Returns

`LatticeSpace | undefined` - The first match in insertion order, or `undefined`.

## See Also

- [Scene.findAllLatticeSpacesByName](./wasmgpu-world-scene-findalllatticespacesbyname.md)
- [Scene.latticeSpaces](./wasmgpu-world-scene-latticespaces.md)
