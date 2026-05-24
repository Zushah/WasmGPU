# Scene.traverseNodeLinks

## Summary
Scene.traverseNodeLinks iterates through every nodelink currently in the scene. Use this for synchronized graph updates, style changes, or metadata extraction.

## Syntax
```ts
Scene.traverseNodeLinks(callback: (n: NodeLink) => void): void
scene.traverseNodeLinks(callback);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `callback` | `(n: NodeLink) => void` | Yes | Function executed once per nodelink. |

## Returns
`void` - No return value.

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
scene.traverseNodeLinks((graph) => {
    graph.opacity = 0.85;
});
```

## See Also
- [Scene.traverseVisibleNodeLinks](./wasmgpu-world-scene-traversevisiblenodelinks.md)
- [Scene.nodeLinks](./wasmgpu-world-scene-nodelinks.md)
- [Scene.clearNodeLinks](./wasmgpu-world-scene-clearnodelinks.md)
