# createSplatField#getLocalBounds

## Summary

`createSplatField#getLocalBounds()` returns explicit or computed local box-and-sphere bounds. Retained centers/scales are computed lazily; otherwise the result is empty and marked partial when splats exist. Computed bounds conservatively expand each center by three times its largest absolute scale and do not use rotation.

## Syntax

```ts
SplatField.getLocalBounds(): Bounds3
```

## See Also

- [createSplatField#computeBoundsFromCPUData](./createsplatfield-computeboundsfromcpudata.md)
- [createSplatField#getWorldBounds](./createsplatfield-getworldbounds.md)
