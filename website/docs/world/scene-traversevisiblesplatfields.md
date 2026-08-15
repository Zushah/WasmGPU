# Scene.traverseVisibleSplatFields

## Summary

`Scene.traverseVisibleSplatFields()` visits attached splat fields whose `visible` property is `true`, in insertion order.

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

- [Scene.traverseSplatFields](./scene-traversesplatfields.md)
- [Scene.visibleSplatFields](./scene-visiblesplatfields.md)
