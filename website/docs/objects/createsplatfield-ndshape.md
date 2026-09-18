# createSplatField#ndShape

## Summary

`createSplatField#ndShape` is an optional shape of positive signed 32-bit integers used to decode linear splat indices.

## Syntax

```ts
SplatField.ndShape: number[] | null
splatField.ndShape = [depth, height, width];
```

## Notes

The getter returns a copy. Assign `null` to disable multidimensional index decoding. Each dimension must be a positive signed 32-bit integer. When the shape describes the complete field, its product must equal `splatCount`.

## See Also

- [createSplatField#mapLinearIndexToNd](./createsplatfield-maplinearindextond.md)
- [createSplatField#splatCount](./createsplatfield-splatcount.md)
