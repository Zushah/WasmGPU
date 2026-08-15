# Scene.findAllNodeLinksByName

## Summary
Scene.findAllNodeLinksByName returns every nodelink whose `name` equals the provided string. Use this when multiple graph objects share one logical label. The method returns an empty array when no matches exist.

## Syntax
```ts
Scene.findAllNodeLinksByName(name: string): NodeLink[]
const links = scene.findAllNodeLinksByName(name);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Exact nodelink name to match. |

## Returns
`NodeLink[]` - Array of matching nodelink instances.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const scene = wgpu.createScene();
for (let i = 0; i < 2; i++) {
    const graph = wgpu.createNodeLink({
        nodePositions: new Float32Array([
            -0.5, 0.0, 0.0,
             0.5, 0.0, 0.0
        ]),
        edges: new Uint16Array([0, 1])
    });
    graph.name = "graph-group";
    scene.add(graph);
}
console.log(scene.findAllNodeLinksByName("graph-group").length);
```

## See Also
- [Scene.findNodeLinkByName](./scene-findnodelinkbyname.md)
- [Scene.traverseNodeLinks](./scene-traversenodelinks.md)
- [Scene.nodeLinks](./scene-nodelinks.md)
