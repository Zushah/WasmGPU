# createScene#findAllPointCloudsByName

## Summary
createScene#findAllPointCloudsByName returns every point cloud whose `name` equals the provided string. Use this when multiple point cloud chunks share a logical label. The method returns an empty array when no matches exist.

## Syntax
```ts
Scene.findAllPointCloudsByName(name: string): PointCloud[]
const clouds = scene.findAllPointCloudsByName(name);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Exact point cloud name to match. |

## Returns
`PointCloud[]` - Array of matching point cloud instances.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
for (let i = 0; i < 2; i++) {
    const cloud = wgpu.createPointCloud({ pointCount: 0, scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
    cloud.name = "samples";
    scene.add(cloud);
}
console.log(scene.findAllPointCloudsByName("samples").length);
```

## See Also
- [createScene#findPointCloudByName](./createscene-findpointcloudbyname.md)
- [createScene#pointClouds](./createscene-pointclouds.md)
- [createScene#visiblePointClouds](./createscene-visiblepointclouds.md)
