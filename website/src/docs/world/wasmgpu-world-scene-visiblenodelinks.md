# Scene.visibleNodeLinks

## Summary
Scene.visibleNodeLinks returns only nodelinks with `visible === true`. Use this to inspect render-active graph subsets without manually filtering the full collection.

## Syntax
```ts
Scene.visibleNodeLinks: NodeLink[]
const links = scene.visibleNodeLinks;
```

## Parameters
This property does not take parameters.

## Returns
`NodeLink[]` - Visible nodelink subset.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
const graph = wgpu.createNodeLink({
    nodePositions: new Float32Array([
        -0.5, 0.0, 0.0,
         0.5, 0.0, 0.0
    ]),
    edges: new Uint16Array([0, 1])
});
graph.visible = true;
scene.add(graph);
console.log(scene.visibleNodeLinks.length);
```

## See Also
- [Scene.nodeLinks](./wasmgpu-world-scene-nodelinks.md)
- [Scene.traverseVisibleNodeLinks](./wasmgpu-world-scene-traversevisiblenodelinks.md)
- [Scene.getBounds](./wasmgpu-world-scene-getbounds.md)
