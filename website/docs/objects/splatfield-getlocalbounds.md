# SplatField.getLocalBounds

## Summary

`SplatField.getLocalBounds()` returns the field's local box-and-sphere bounds. If no explicit bounds exist, retained CPU center/scale data is used lazily.

## Syntax

```ts
SplatField.getLocalBounds(): Bounds3
```

## See Also

- [SplatField.computeBoundsFromCPUData](./splatfield-computeboundsfromcpudata.md)
- [SplatField.getWorldBounds](./splatfield-getworldbounds.md)
