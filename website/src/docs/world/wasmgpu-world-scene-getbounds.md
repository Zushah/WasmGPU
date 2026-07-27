# Scene.getBounds

## Summary
Scene.getBounds computes an aggregate bounding volume from meshes, point clouds, glyph fields, node links, splat fields, and lattice spaces. By default it only considers visible objects. The result includes box and sphere bounds plus empty/partial flags.

## Syntax
```ts
Scene.getBounds(options?: SceneBoundsOptions): Bounds3
const bounds = scene.getBounds(options);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `options` | `SceneBoundsOptions` | No | Controls whether hidden objects are included in the aggregation. |

## Returns
`Bounds3` - Aggregated world-space bounds for the selected object subset.

## Type Details
### SceneBoundsOptions

```ts
type SceneBoundsOptions = {
    visibleOnly?: boolean;
};
```

#### SceneBoundsOptions Fields
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `visibleOnly` | `boolean` | No | When true (default), ignore hidden objects across every renderable family. |

### Vec3

```ts
type Vec3 = [number, number, number];
```

### Bounds3

```ts
type Bounds3 = {
    boxMin: Vec3;
    boxMax: Vec3;
    sphereCenter: Vec3;
    sphereRadius: number;
    empty: boolean;
    partial: boolean;
};
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
scene.add(wgpu.createNodeLink({
    nodePositions: new Float32Array([
        -1.0, 0.0, 0.0,
         0.0, 1.0, 0.0,
         1.0, 0.0, 0.0
    ]),
    edges: new Uint16Array([
        0, 1,
        1, 2
    ])
}));
const visibleBounds = scene.getBounds();
const allBounds = scene.getBounds({ visibleOnly: false });
console.log(visibleBounds, allBounds);
```

## See Also
- [Scene.visibleMeshes](./wasmgpu-world-scene-visiblemeshes.md)
- [Scene.visiblePointClouds](./wasmgpu-world-scene-visiblepointclouds.md)
- [Scene.visibleGlyphFields](./wasmgpu-world-scene-visibleglyphfields.md)
- [Scene.visibleNodeLinks](./wasmgpu-world-scene-visiblenodelinks.md)
- [Scene.splatFields and related APIs](./wasmgpu-world-scene-splatfields.md)
- [Scene.latticeSpaces and related APIs](./wasmgpu-world-scene-latticespaces.md)
- [Scene.traverseVisibleNodeLinks](./wasmgpu-world-scene-traversevisiblenodelinks.md)
