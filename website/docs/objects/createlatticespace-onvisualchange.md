# createLatticeSpace#onVisualChange

## Summary

`createLatticeSpace#onVisualChange()` subscribes to the lattice's explicit scale, colormap, and color-mode notifications.

## Syntax

```ts
LatticeSpace.onVisualChange(listener: (kind: "scale" | "colormap" | "visual") => void): () => void
```

## Returns

`() => void` - An unsubscribe function.

## Notes

`setScaleTransform()` and `applyScaleStats()` emit `"scale"`; assigning `colormap` or `colormapStops` emits `"colormap"`; and changing `colorMode` emits `"visual"`. Other mutable appearance and layout properties do not invoke this listener. Listener exceptions are ignored.

## See Also

- [createLatticeSpace#setScaleTransform](./createlatticespace-setscaletransform.md)
- [createLatticeSpace#colormap](./createlatticespace-colormap.md)
