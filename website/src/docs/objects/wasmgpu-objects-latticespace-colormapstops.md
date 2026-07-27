# LatticeSpace.colormapStops

## Summary

`LatticeSpace.colormapStops` contains the custom RGBA stops used when `colormap` is `"custom"`.

## Syntax

```ts
LatticeSpace.colormapStops: ReadonlyArray<[number, number, number, number]>
```

## Notes

At least two stops are required. WasmGPU stores copies and packs up to eight stops in the object's uniform data.

## See Also

- [LatticeSpace.colormap](./wasmgpu-objects-latticespace-colormap.md)
- [LatticeSpace.getUniformData](./wasmgpu-objects-latticespace-getuniformdata.md)
