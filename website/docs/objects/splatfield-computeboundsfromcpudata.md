# SplatField.computeBoundsFromCPUData

## Summary

`SplatField.computeBoundsFromCPUData()` computes conservative local bounds by expanding each retained center by three times its largest absolute scale.

## Syntax

```ts
SplatField.computeBoundsFromCPUData(): void
```

## Notes

The method does nothing when center/scale CPU arrays are unavailable. Supply explicit descriptor bounds for GPU-only data.

## See Also

- [SplatField.getLocalBounds](./splatfield-getlocalbounds.md)
- [SplatField.dropCPUData](./splatfield-dropcpudata.md)
