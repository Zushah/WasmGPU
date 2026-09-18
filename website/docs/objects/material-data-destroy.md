# material.data#destroy

## Summary
material.data#destroy releases one reference. On final release it destroys a data buffer created by the material, but only detaches an external buffer supplied to `setDataBuffer`; it also drops CPU data and visual-change listeners. Releasing a still-shared material does not dispose those resources yet.

## Syntax
```ts
DataMaterial.destroy(): void
material.destroy();
```

## See Also
- [material.data#dropCPUData](./material-data-dropcpudata.md)
- [material.data#upload](./material-data-upload.md)
- [material#destroy](./material-destroy.md)
