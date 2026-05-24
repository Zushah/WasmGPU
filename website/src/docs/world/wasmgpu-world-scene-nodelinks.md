# Scene.nodeLinks

## Summary
Scene.nodeLinks returns all nodelink objects in the scene, including those not currently visible. Use this collection for graph-specific updates, diagnostics, and object management.

## Syntax
```ts
Scene.nodeLinks: readonly NodeLink[]
const links = scene.nodeLinks;
```

## Parameters
This property does not take parameters.

## Returns
`readonly NodeLink[]` - Scene nodelink collection in insertion order.

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
console.log(scene.nodeLinks.length);
```

## See Also
- [Scene.visibleNodeLinks](./wasmgpu-world-scene-visiblenodelinks.md)
- [Scene.clearNodeLinks](./wasmgpu-world-scene-clearnodelinks.md)
- [Scene.traverseNodeLinks](./wasmgpu-world-scene-traversenodelinks.md)
