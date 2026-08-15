# Scene.findPointCloudByName

## Summary
Scene.findPointCloudByName returns the first point cloud whose `name` exactly matches the input. It searches only point cloud objects. Use it for direct lookup when point cloud names are unique.

## Syntax
```ts
Scene.findPointCloudByName(name: string): PointCloud | undefined
const cloud = scene.findPointCloudByName(name);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Exact point cloud name to search for. |

## Returns
`PointCloud | undefined` - First matching point cloud, or `undefined` if none match.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const cloud = wgpu.createPointCloud({ pointCount: 0, scaleTransform: { mode: "linear", domainMin: 0, domainMax: 1 } });
cloud.name = "samples";
scene.add(cloud);

console.log(scene.findPointCloudByName("samples"));
```

## See Also
- [Scene.findAllPointCloudsByName](./scene-findallpointcloudsbyname.md)
- [Scene.pointClouds](./scene-pointclouds.md)
- [Scene.traversePointClouds](./scene-traversepointclouds.md)
