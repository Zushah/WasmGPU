# Scene.destroy

## Summary
Scene.destroy releases resources for all scene objects and clears all collections, including lights. It calls `destroy()` on meshes, point clouds, glyph fields, node links, splat fields, and lattice spaces currently in the scene. After destruction, the scene can be reused but will be empty.

## Syntax
```ts
Scene.destroy(): void
scene.destroy();
```

## Parameters
This method does not take parameters.

## Returns
`void` - No value is returned; the call performs object/resource cleanup.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
scene.add(wgpu.createMesh(wgpu.geometry.box(1, 1, 1), wgpu.material.unlit({ color: [0.8, 0.3, 0.2] })));
scene.addLight(wgpu.createLight.ambient({ intensity: 0.2 }));

scene.destroy();
```

## See Also
- [Scene.clear](./wasmgpu-world-scene-clear.md)
- [Scene.clearLights](./wasmgpu-world-scene-clearlights.md)
- [Scene.remove](./wasmgpu-world-scene-remove.md)
