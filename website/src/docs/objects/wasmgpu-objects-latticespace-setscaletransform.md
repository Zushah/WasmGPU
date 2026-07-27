# LatticeSpace.setScaleTransform

## Summary

`LatticeSpace.setScaleTransform()` replaces the scalar mapping used by scalar color mode.

## Syntax

```ts
LatticeSpace.setScaleTransform(transform: ScaleTransformDescriptor | ScaleTransform): void
```

## Notes

The transform is normalized to the lattice's packed component layout; its component selection cannot exceed `componentCount`.

## See Also

- [LatticeSpace.scaleTransform](./wasmgpu-objects-latticespace-scaletransform.md)
- [LatticeSpace.applyScaleStats](./wasmgpu-objects-latticespace-applyscalestats.md)
