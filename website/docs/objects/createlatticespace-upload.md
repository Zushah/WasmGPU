# createLatticeSpace#upload

## Summary

`createLatticeSpace#upload()` realizes dirty CPU or WebAssembly data and masks in GPU storage.
Managed buffers grow as needed and are reused when capacity permits; Wasm views are refreshed before copying and CPU snapshots are discarded unless retention is enabled. External GPU buffers are already resident and use the corresponding `mark*Dirty()` method after direct writes.

## Syntax

```ts
LatticeSpace.upload(device: GPUDevice, queue: GPUQueue): void
```

## Notes

Object-managed storage buffers grow when required and are reused when capacity is sufficient. Attached WebAssembly views are refreshed immediately before copying. Upload never frees borrowed memory; CPU snapshots are discarded unless retention is enabled. External GPU buffers do not need upload; after writing them directly, call the appropriate `mark*Dirty()` method to advance revisions.

## See Also

- [createLatticeSpace#markDataDirty](./createlatticespace-markdatadirty.md)
- [createLatticeSpace#markMaskDirty](./createlatticespace-markmaskdirty.md)
