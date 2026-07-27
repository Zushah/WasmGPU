# Scene.clearNodeLinks

## Summary
Scene.clearNodeLinks removes only node-link objects from the scene. Meshes, point clouds, glyph fields, splat fields, lattice spaces, and lights remain unchanged. Use it when graph-style content is updated independently of the rest of the scene.

## Syntax
```ts
Scene.clearNodeLinks(): Scene
const result = scene.clearNodeLinks();
```

## Parameters
This method does not take parameters.

## Returns
`Scene` - The same scene instance with `nodeLinks` cleared.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

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
- [Scene.clear](./wasmgpu-world-scene-clear.md)
- [Scene.nodeLinks](./wasmgpu-world-scene-nodelinks.md)
- [Scene.traverseNodeLinks](./wasmgpu-world-scene-traversenodelinks.md)
- [Scene.traverseVisibleNodeLinks](./wasmgpu-world-scene-traversevisiblenodelinks.md)
