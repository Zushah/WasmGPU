# material#destroy

## Summary
material#destroy releases one reference from the material's reference-counted lifetime. GPU resources and subclass-owned state are disposed only when the final reference reaches zero. Calling it again after final release throws; textures referenced by a material are not destroyed by the material.

## Syntax
```ts
Material.destroy(): void
material.destroy();
```

## See Also
- [material#dirty](./material-dirty.md)
- [material#markClean](./material-markclean.md)
