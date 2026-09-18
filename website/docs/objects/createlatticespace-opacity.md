# createLatticeSpace#opacity

## Summary

`createLatticeSpace#opacity` is the finite global cell-opacity multiplier.

## Syntax

```ts
LatticeSpace.opacity: number
```

## Notes

The property retains the assigned finite value. `getUniformData()` clamps it to `[0, 1]` for rendering.

## See Also

- [createLatticeSpace#blendMode](./createlatticespace-blendmode.md)
- [createLatticeSpace#dirtyUniforms](./createlatticespace-dirtyuniforms.md)
