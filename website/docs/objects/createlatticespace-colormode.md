# createLatticeSpace#colorMode

## Summary

`createLatticeSpace#colorMode` selects scalar-colormap, direct RGBA, or solid-color rendering.

## Syntax

```ts
LatticeSpace.colorMode: "scalar" | "rgba" | "solid"
```

## Notes

`"rgba"` requires `componentCount === 4`; `"solid"` ignores cell values for color.

## See Also

- [createLatticeSpace#colorSpace](./createlatticespace-colorspace.md)
- [createLatticeSpace#solidColor](./createlatticespace-solidcolor.md)
