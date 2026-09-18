# createLatticeSpace#markMaskDirty

## Summary

`createLatticeSpace#markMaskDirty()` announces that an externally managed `maskBuffer` changed by advancing the mask revision.

## Syntax

```ts
LatticeSpace.markMaskDirty(): void
```

## Notes

This method requires an existing `maskBuffer`. CPU and WebAssembly mask sources establish dirty upload state through their setters and refresh methods.

## See Also

- [createLatticeSpace#upload](./createlatticespace-upload.md)
- [createLatticeSpace#setMask](./createlatticespace-setmask.md)
