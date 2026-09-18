# createScene#destroy

## Summary
createScene#destroy releases resources for all scene objects and clears all collections, including lights. It calls `destroy()` on meshes, point clouds, glyph fields, node links, splat fields, and lattice spaces currently in the scene. After destruction, the scene can be reused but will be empty.
This gives the scene destruction ownership over every object still attached at call time. Remove shared or externally owned objects first if they must remain usable elsewhere; lights have no destroy method and are only detached.

## Syntax
```ts
Scene.destroy(): void
scene.destroy();
```

## Parameters
This method does not take parameters.

## Returns
`void` - No value is returned; the call performs object/resource cleanup.

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
- [createScene#clear](./createscene-clear.md)
- [createScene#clearLights](./createscene-clearlights.md)
- [createScene#remove](./createscene-remove.md)
