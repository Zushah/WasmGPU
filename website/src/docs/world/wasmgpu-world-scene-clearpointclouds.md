# Scene.clearPointClouds

## Summary
Scene.clearPointClouds removes only point cloud objects from the scene. Meshes, glyph fields, nodelinks, and lights remain unchanged. Use it when streaming or reloading point cloud data independently.

## Syntax
```ts
Scene.clearPointClouds(): Scene
const result = scene.clearPointClouds();
```

## Parameters
This method does not take parameters.

## Returns
`Scene` - The same scene instance with `pointClouds` cleared.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

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
- [Scene.clear](./wasmgpu-world-scene-clear.md)
- [Scene.pointClouds](./wasmgpu-world-scene-pointclouds.md)
- [Scene.traversePointClouds](./wasmgpu-world-scene-traversepointclouds.md)
- [Scene.traverseVisiblePointClouds](./wasmgpu-world-scene-traversevisiblepointclouds.md)
