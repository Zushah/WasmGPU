# createScene#traverseVisibleNodeLinks

## Summary
createScene#traverseVisibleNodeLinks iterates only over nodelinks marked visible. This is useful for per-frame operations that should affect active graph content only.

## Syntax
```ts
Scene.traverseVisibleNodeLinks(callback: (n: NodeLink) => void): void
scene.traverseVisibleNodeLinks(callback);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `callback` | `(n: NodeLink) => void` | Yes | Function executed once per visible nodelink. |

## Returns
`void` - No return value.

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
scene.traverseVisibleNodeLinks((link) => {
    link.opacity = 0.9;
});
```

## See Also
- [createScene#traverseNodeLinks](./createscene-traversenodelinks.md)
- [createScene#visibleNodeLinks](./createscene-visiblenodelinks.md)
- [createScene#getBounds](./createscene-getbounds.md)
