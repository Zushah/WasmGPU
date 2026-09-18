# createScene#clear

## Summary
createScene#clear removes all meshes, point clouds, glyph fields, node links, splat fields, and lattice spaces from the scene in one call. Light objects are not affected. Removed objects are not destroyed.

## Syntax
```ts
Scene.clear(): Scene
const result = scene.clear();
```

## Parameters
This method does not take parameters.

## Returns
`Scene` - The same scene instance with object collections emptied.

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
- [createScene#clearPointClouds](./createscene-clearpointclouds.md)
- [createScene#clearGlyphFields](./createscene-clearglyphfields.md)
- [createScene#clearNodeLinks](./createscene-clearnodelinks.md)
- [createScene#splatFields and related APIs](./createscene-splatfields.md)
- [createScene#latticeSpaces and related APIs](./createscene-latticespaces.md)
- [createScene#clearLights](./createscene-clearlights.md)
- [createScene#destroy](./createscene-destroy.md)
