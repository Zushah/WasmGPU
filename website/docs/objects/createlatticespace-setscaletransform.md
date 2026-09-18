# createLatticeSpace#setScaleTransform

## Summary

`createLatticeSpace#setScaleTransform()` replaces the scalar mapping used by scalar color mode.
The descriptor is normalized to the lattice's packed component layout, then uniforms are marked dirty and scale-change listeners are notified; cell data is not rewritten.

## Syntax

```ts
LatticeSpace.setScaleTransform(transform: ScaleTransformDescriptor | ScaleTransform): void
```

## Notes

The transform is normalized to the lattice's packed component layout; its component selection cannot exceed `componentCount`.

## See Also

- [createLatticeSpace#scaleTransform](./createlatticespace-scaletransform.md)
- [createLatticeSpace#applyScaleStats](./createlatticespace-applyscalestats.md)
