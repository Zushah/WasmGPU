# LatticeSpace.valueRange

## Summary

`LatticeSpace.valueRange` optionally fixes the scalar range used for colormap normalization.

## Syntax

```ts
LatticeSpace.valueRange: [number, number] | null
```

## Notes

Assign `null` to use the active scale transform without an explicit visual clamp.

## See Also

- [LatticeSpace.scaleTransform](./wasmgpu-objects-latticespace-scaletransform.md)
- [LatticeSpace.colormap](./wasmgpu-objects-latticespace-colormap.md)
