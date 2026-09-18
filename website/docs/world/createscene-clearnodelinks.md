# createScene#clearNodeLinks

## Summary
createScene#clearNodeLinks removes only node-link objects from the scene. Meshes, point clouds, glyph fields, splat fields, lattice spaces, and lights remain unchanged. Use it when graph-style content is updated independently of the rest of the scene.
Detached node-link objects are not destroyed.

## Syntax
```ts
Scene.clearNodeLinks(): Scene
const result = scene.clearNodeLinks();
```

## Parameters
This method does not take parameters.

## Returns
`Scene` - The same scene instance with `nodeLinks` cleared.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
scene.add(wgpu.createNodeLink({
    nodePositions: new Float32Array([
        -0.5, 0.0, 0.0,
         0.5, 0.0, 0.0
    ]),
    edges: new Uint16Array([0, 1])
}));
scene.clearNodeLinks();
console.log(scene.nodeLinks.length);
```

## See Also
- [createScene#clear](./createscene-clear.md)
- [createScene#nodeLinks](./createscene-nodelinks.md)
- [createScene#traverseNodeLinks](./createscene-traversenodelinks.md)
- [createScene#traverseVisibleNodeLinks](./createscene-traversevisiblenodelinks.md)
