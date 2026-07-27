# LatticeSpace.colorMode

## Summary

`LatticeSpace.colorMode` selects scalar-colormap, direct RGBA, or solid-color rendering.

## Syntax

```ts
LatticeSpace.colorMode: "scalar" | "rgba" | "solid"
```

## Notes

`"rgba"` requires `componentCount === 4`; `"solid"` ignores cell values for color.

## See Also

- [LatticeSpace.colorSpace](./wasmgpu-objects-latticespace-colorspace.md)
- [LatticeSpace.solidColor](./wasmgpu-objects-latticespace-solidcolor.md)
