# SplatField.dropCPUData

## Summary

`SplatField.dropCPUData()` releases retained center, rotation, scale, color, and spherical-harmonic arrays without destroying GPU resources.

## Syntax

```ts
SplatField.dropCPUData(): void
```

## Notes

Record inspection, attribute-rich picking, and later CPU bounds recomputation become unavailable until data is retained again.

## See Also

- [SplatField.getSplatRecord](./splatfield-getsplatrecord.md)
- [SplatField.computeBoundsFromCPUData](./splatfield-computeboundsfromcpudata.md)
