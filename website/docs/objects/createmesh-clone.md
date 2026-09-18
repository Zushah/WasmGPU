# createMesh#clone

## Summary
createMesh#clone creates an unparented mesh that shares—and retains—the source geometry and material. It copies the local transform, name, visibility and shadow flags, and current morph weights. It does not copy `userData`, hierarchy, scene membership, or a skin instance.

## Syntax
```ts
Mesh.clone(): Mesh
const result = mesh.clone();
```

## Returns
`Mesh` - Unparented clone with retained geometry/material references and copied local state.

## See Also
- [createMesh#cloneWithMaterial](./createmesh-clonewithmaterial.md)
- [createMesh#destroy](./createmesh-destroy.md)
