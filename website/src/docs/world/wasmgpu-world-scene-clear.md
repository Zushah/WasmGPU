# Scene.clear

## Summary
Scene.clear removes all meshes, point clouds, glyph fields, and nodelinks from the scene in one call. Light objects are not affected by this method. Use this when rebuilding object content while preserving lighting setup.

## Syntax
```ts
Scene.clear(): Scene
const result = scene.clear();
```

## Parameters
This method does not take parameters.

## Returns
`Scene` - The same scene instance with object collections emptied.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
scene.add(wgpu.createMesh(wgpu.geometry.box(1, 1, 1), wgpu.material.unlit({ color: [0.9, 0.4, 0.2] })));
scene.add(wgpu.createNodeLink({
    nodePositions: new Float32Array([
        -0.5, 0.0, 0.0,
         0.5, 0.0, 0.0
    ]),
    edges: new Uint16Array([0, 1])
}));

scene.clear();
console.log(scene.meshes.length, scene.nodeLinks.length);
```

## See Also
- [Scene.clearPointClouds](./wasmgpu-world-scene-clearpointclouds.md)
- [Scene.clearGlyphFields](./wasmgpu-world-scene-clearglyphfields.md)
- [Scene.clearNodeLinks](./wasmgpu-world-scene-clearnodelinks.md)
- [Scene.clearLights](./wasmgpu-world-scene-clearlights.md)
- [Scene.destroy](./wasmgpu-world-scene-destroy.md)
