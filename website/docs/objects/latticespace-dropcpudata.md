# LatticeSpace.dropCPUData

## Summary

`LatticeSpace.dropCPUData()` releases retained cell and mask arrays without destroying GPU resources or detaching WebAssembly views.

## Syntax

```ts
LatticeSpace.dropCPUData(): void
```

## Notes

Record inspection and partial CPU updates become unavailable until data is retained again.

## See Also

- [LatticeSpace.getCellRecord](./latticespace-getcellrecord.md)
- [LatticeSpace.updateData](./latticespace-updatedata.md)
