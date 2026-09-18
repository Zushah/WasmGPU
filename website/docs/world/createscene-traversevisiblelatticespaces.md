# createScene#traverseVisibleLatticeSpaces

## Summary

`createScene#traverseVisibleLatticeSpaces()` visits attached lattice spaces whose `visible` property is `true`, in insertion order.

## Syntax

```ts
Scene.traverseVisibleLatticeSpaces(callback: (latticeSpace: LatticeSpace) => void): void
```

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `callback` | `(latticeSpace: LatticeSpace) => void` | Yes | Function invoked once for each visible space. |

## Returns

`void`

## See Also

- [createScene#traverseLatticeSpaces](./createscene-traverselatticespaces.md)
- [createScene#visibleLatticeSpaces](./createscene-visiblelatticespaces.md)
