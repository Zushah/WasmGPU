# createScene#traverseSplatFields

## Summary

`createScene#traverseSplatFields()` visits every attached splat field in insertion order, including invisible fields.

## Syntax

```ts
Scene.traverseSplatFields(callback: (splatField: SplatField) => void): void
```

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `callback` | `(splatField: SplatField) => void` | Yes | Function invoked once for each field. |

## Returns

`void`

## See Also

- [createScene#traverseVisibleSplatFields](./createscene-traversevisiblesplatfields.md)
- [createScene#splatFields](./createscene-splatfields.md)
