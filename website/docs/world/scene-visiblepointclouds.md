# Scene.visiblePointClouds

## Summary
Scene.visiblePointClouds returns only point clouds with `visible === true`. Use this to inspect render-active cloud subsets without manually filtering the full list.

## Syntax
```ts
Scene.visiblePointClouds: PointCloud[]
const clouds = scene.visiblePointClouds;
```

## Parameters
This property does not take parameters.

## Returns
`PointCloud[]` - Visible point cloud subset.

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
pc.visible = true;
scene.add(pc);
console.log(scene.visiblePointClouds.length);
```

## See Also
- [Scene.pointClouds](./scene-pointclouds.md)
- [Scene.traverseVisiblePointClouds](./scene-traversevisiblepointclouds.md)
- [Scene.getBounds](./scene-getbounds.md)
