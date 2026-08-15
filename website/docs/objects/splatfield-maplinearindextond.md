# SplatField.mapLinearIndexToNd

## Summary

`SplatField.mapLinearIndexToNd()` decodes a linear splat index using `ndShape`.

## Syntax

```ts
SplatField.mapLinearIndexToNd(index: number): number[] | null
```

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `index` | `number` | Yes | Zero-based linear splat index. |

## Returns

`number[] | null` - The decoded index, or `null` when no shape is configured or the index is invalid.

## See Also

- [SplatField.ndShape](./splatfield-ndshape.md)
- [SplatField.getSplatRecord](./splatfield-getsplatrecord.md)
