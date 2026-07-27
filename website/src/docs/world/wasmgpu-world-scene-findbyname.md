# Scene.findByName

## Summary
Scene.findByName returns the first mesh whose `name` exactly matches the input string. It is mesh-specific; point clouds, glyph fields, NodeLink objects, splat fields, and lattice spaces have family-specific lookup methods.

## Syntax
```ts
Scene.findByName(name: string): Mesh | undefined
const mesh = scene.findByName(name);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Exact mesh name to search for. |

## Returns
`Mesh | undefined` - First matching mesh, or `undefined` if no mesh has that name.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const mesh = wgpu.createMesh(wgpu.geometry.box(1, 1, 1), wgpu.material.unlit({ color: [0.9, 0.4, 0.2] }));
mesh.name = "roi";
scene.add(mesh);

console.log(scene.findByName("roi"));
```

## See Also
- [Scene.findAllByName](./wasmgpu-world-scene-findallbyname.md)
- [Scene.findPointCloudByName](./wasmgpu-world-scene-findpointcloudbyname.md)
- [Scene.findGlyphFieldByName](./wasmgpu-world-scene-findglyphfieldbyname.md)
- [Scene.splatFields and splat-field lookup](./wasmgpu-world-scene-splatfields.md)
- [Scene.latticeSpaces and lattice-space lookup](./wasmgpu-world-scene-latticespaces.md)
