# material.data#dropCPUData

## Summary
material.data#dropCPUData releases the material's CPU-array reference without changing its current GPU buffer. Calling it before pending CPU data is uploaded discards that pending source, so a later upload has nothing to transfer.

## Syntax
```ts
DataMaterial.dropCPUData(): void
material.dropCPUData();
```

## See Also
- [material.data#destroy](./material-data-destroy.md)
- [material.data#setData](./material-data-setdata.md)
- [material.data#upload](./material-data-upload.md)
