# createScene#clearPointClouds

## Summary
createScene#clearPointClouds removes only point cloud objects from the scene. Meshes, glyph fields, node links, splat fields, lattice spaces, and lights remain unchanged. Use it when streaming or reloading point cloud data independently.
Detached point clouds are not destroyed; destroy them separately when their CPU/GPU resources are no longer needed.

## Syntax
```ts
Scene.clearPointClouds(): Scene
const result = scene.clearPointClouds();
```

## Parameters
This method does not take parameters.

## Returns
`Scene` - The same scene instance with `pointClouds` cleared.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const pc = wgpu.createPointCloud({ pointCount: 0, scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
scene.add(pc);
scene.clearPointClouds();
console.log(scene.pointClouds.length);
```

## See Also
- [createScene#clear](./createscene-clear.md)
- [createScene#pointClouds](./createscene-pointclouds.md)
- [createScene#traversePointClouds](./createscene-traversepointclouds.md)
- [createScene#traverseVisiblePointClouds](./createscene-traversevisiblepointclouds.md)
