# createMesh#worldMatrix

## Summary
createMesh#worldMatrix updates the global transform store if needed, rewrites the mesh transform's reusable 16-element matrix array, and returns it. The matrix includes the parent chain; copy it for a persistent snapshot. Access after mesh destruction throws.

## Syntax
```ts
Mesh.worldMatrix: number[]
const value = mesh.worldMatrix;
```

## Returns
`number[]` - Reused 16-element world-matrix array.

## See Also
- [createMesh#getBounds](./createmesh-getbounds.md)
- [createMesh#getWorldBounds](./createmesh-getworldbounds.md)
- [createMesh#setParent](./createmesh-setparent.md)
