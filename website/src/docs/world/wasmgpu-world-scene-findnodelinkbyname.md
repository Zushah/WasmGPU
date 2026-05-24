# Scene.findNodeLinkByName

## Summary
Scene.findNodeLinkByName returns the first nodelink whose `name` exactly matches the input. It searches only nodelink objects. Use it for direct lookup when nodelink names are unique.

## Syntax
```ts
Scene.findNodeLinkByName(name: string): NodeLink | undefined
const link = scene.findNodeLinkByName(name);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | `string` | Yes | Exact nodelink name to search for. |

## Returns
`NodeLink | undefined` - First matching nodelink, or `undefined` if none match.

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
graph.name = "protein-graph";
scene.add(graph);

console.log(scene.findNodeLinkByName("protein-graph"));
```

## See Also
- [Scene.findAllNodeLinksByName](./wasmgpu-world-scene-findallnodelinksbyname.md)
- [Scene.nodeLinks](./wasmgpu-world-scene-nodelinks.md)
- [Scene.traverseNodeLinks](./wasmgpu-world-scene-traversenodelinks.md)
