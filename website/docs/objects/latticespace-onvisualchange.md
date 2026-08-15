# LatticeSpace.onVisualChange

## Summary

`LatticeSpace.onVisualChange()` subscribes to scale, colormap, and general visual changes.

## Syntax

```ts
LatticeSpace.onVisualChange(listener: (kind: "scale" | "colormap" | "visual") => void): () => void
```

## Returns

`() => void` - An unsubscribe function.

## See Also

- [LatticeSpace.setScaleTransform](./latticespace-setscaletransform.md)
- [LatticeSpace.colormap](./latticespace-colormap.md)
