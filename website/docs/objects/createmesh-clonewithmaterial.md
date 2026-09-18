# createMesh#cloneWithMaterial

## Summary
createMesh#cloneWithMaterial creates an unparented mesh that retains the source geometry but takes one existing reference to the supplied material without retaining it. It copies local transform, name, visibility and shadow flags, and morph weights, but not `userData`, hierarchy, scene membership, or skin.

## Syntax
```ts
Mesh.cloneWithMaterial(material: Material): Mesh
const result = mesh.cloneWithMaterial(material);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `material` | `Material` | Yes | Material reference transferred to the clone. Call `retain()` first if another owner must independently release the same material. |

## Returns
`Mesh` - Unparented clone with retained source geometry, the transferred material reference, and copied local state.

## See Also
- [createMesh#clone](./createmesh-clone.md)
- [createMesh#destroy](./createmesh-destroy.md)
