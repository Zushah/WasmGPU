# createLatticeSpace#markDataDirty

## Summary

`createLatticeSpace#markDataDirty()` announces that an externally managed `dataBuffer` changed by advancing data and scale revisions.

## Syntax

```ts
LatticeSpace.markDataDirty(): void
```

## Notes

This method requires an existing `dataBuffer`. It does not copy CPU or WebAssembly data; those source families establish dirty upload state through their setters and refresh methods.

## See Also

- [createLatticeSpace#upload](./createlatticespace-upload.md)
- [createLatticeSpace#getScaleSourceDescriptor](./createlatticespace-getscalesourcedescriptor.md)
