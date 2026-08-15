# Scene.pointClouds

## Summary
Scene.pointClouds returns all point cloud objects in the scene, including those not currently visible. Use this list for batch updates, selection integration, or point-data lifecycle management.

## Syntax
```ts
Scene.pointClouds: readonly PointCloud[]
const clouds = scene.pointClouds;
```

## Parameters
This property does not take parameters.

## Returns
`readonly PointCloud[]` - Scene point cloud collection in insertion order.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
scene.add(wgpu.createPointCloud({ pointCount: 0, scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } }));
console.log(scene.pointClouds.length);
```

## See Also
- [Scene.visiblePointClouds](./scene-visiblepointclouds.md)
- [Scene.clearPointClouds](./scene-clearpointclouds.md)
- [Scene.traversePointClouds](./scene-traversepointclouds.md)
