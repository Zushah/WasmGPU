# createScene#traversePointClouds

## Summary
createScene#traversePointClouds iterates through every point cloud currently in the scene. Use this for synchronized point-cloud updates, style tuning, or metadata extraction.

## Syntax
```ts
Scene.traversePointClouds(callback: (pc: PointCloud) => void): void
scene.traversePointClouds(callback);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `callback` | `(pc: PointCloud) => void` | Yes | Function executed once per point cloud. |

## Returns
`void` - No return value.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
scene.add(wgpu.createPointCloud({ pointCount: 0, scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } }));
scene.traversePointClouds((pc) => {
    pc.opacity = 0.8;
});
```

## See Also
- [createScene#traverseVisiblePointClouds](./createscene-traversevisiblepointclouds.md)
- [createScene#pointClouds](./createscene-pointclouds.md)
- [createScene#clearPointClouds](./createscene-clearpointclouds.md)
