# Scene.traverseVisiblePointClouds

## Summary
Scene.traverseVisiblePointClouds iterates only over point clouds marked visible. This is useful for per-frame operations that should affect active render content only.

## Syntax
```ts
Scene.traverseVisiblePointClouds(callback: (pc: PointCloud) => void): void
scene.traverseVisiblePointClouds(callback);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `callback` | `(pc: PointCloud) => void` | Yes | Function executed once per visible point cloud. |

## Returns
`void` - No return value.

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
scene.traverseVisiblePointClouds((cloud) => {
    cloud.basePointSize = 3.0;
});
```

## See Also
- [Scene.traversePointClouds](./scene-traversepointclouds.md)
- [Scene.visiblePointClouds](./scene-visiblepointclouds.md)
- [Scene.getBounds](./scene-getbounds.md)
