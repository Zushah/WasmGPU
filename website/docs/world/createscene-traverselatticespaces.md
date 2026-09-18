# createScene#traverseLatticeSpaces

## Summary

`createScene#traverseLatticeSpaces()` visits every attached lattice space in insertion order, including invisible spaces.

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

- [createScene#traverseVisibleLatticeSpaces](./createscene-traversevisiblelatticespaces.md)
- [createScene#latticeSpaces](./createscene-latticespaces.md)
