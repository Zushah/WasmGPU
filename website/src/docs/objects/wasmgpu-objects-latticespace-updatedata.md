# LatticeSpace.updateData

## Summary

`LatticeSpace.updateData()` replaces a contiguous range of retained CPU cell values.

## Syntax

```ts
LatticeSpace.updateData(data: Float32Array, startCell?: number): void
```

## Notes

The lattice must retain CPU data. Input length must be a multiple of `componentCount`, and the update range must fit within `cellCount`.

## See Also

- [LatticeSpace.setData](./wasmgpu-objects-latticespace-setdata.md)
- [LatticeSpace.markDataDirty](./wasmgpu-objects-latticespace-markdatadirty.md)
