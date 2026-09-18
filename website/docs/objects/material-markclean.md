# material#markClean

## Summary
material#markClean clears the material's dirty flag after a renderer or custom integration has synchronized its state. It does not upload buffers, create bind groups, or clean referenced textures, and it throws after the material's final release.

## Syntax
```ts
Material.markClean(): void
material.markClean();
```

## See Also
- [material#destroy](./material-destroy.md)
- [material#dirty](./material-dirty.md)
