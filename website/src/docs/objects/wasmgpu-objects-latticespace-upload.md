# LatticeSpace.upload

## Summary

`LatticeSpace.upload()` realizes dirty CPU or WebAssembly data and masks in GPU storage.

## Syntax

```ts
LatticeSpace.upload(device: GPUDevice, queue: GPUQueue): void
```

## Notes

Managed WebAssembly buffers grow when required and are reused when capacity is sufficient. Upload never frees borrowed memory; CPU snapshots are discarded unless retention is enabled.

## See Also

- [LatticeSpace.markDataDirty](./wasmgpu-objects-latticespace-markdatadirty.md)
- [LatticeSpace.markMaskDirty](./wasmgpu-objects-latticespace-markmaskdirty.md)
