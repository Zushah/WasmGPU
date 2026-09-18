# createScene#traverseVisibleSplatFields

## Summary

`createScene#traverseVisibleSplatFields()` visits attached splat fields whose `visible` property is `true`, in insertion order.

## Syntax

```ts
Scene.traverseVisibleSplatFields(callback: (splatField: SplatField) => void): void
```

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `callback` | `(splatField: SplatField) => void` | Yes | Function invoked once for each visible field. |

## Returns

`void`

## See Also

- [createScene#traverseSplatFields](./createscene-traversesplatfields.md)
- [createScene#visibleSplatFields](./createscene-visiblesplatfields.md)
