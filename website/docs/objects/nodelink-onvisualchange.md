# NodeLink.onVisualChange

This page documents the `NodeLink.onVisualChange` method.

## Summary
`NodeLink.onVisualChange` subscribes to high-level visual changes on the nodelink. The listener receives one of three event kinds:

- `scale`
- `colormap`
- `visual`

The returned function unsubscribes that listener.

## Syntax
```ts
NodeLink.onVisualChange(listener: (kind: "scale" | "colormap" | "visual") => void): () => void

const unsubscribe = nodeLink.onVisualChange((kind) => {
    console.log(kind);
});
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `listener` | `(kind: "scale" \| "colormap" \| "visual") => void` | Yes | Callback invoked when the nodelink changes scale, colormap, or other visual state. |

## Returns
`() => void` - Unsubscribe function that removes the listener.

## Example
```js
const unsubscribe = nodeLink.onVisualChange((kind) => {
    if (kind === "scale") console.log("scale changed");
});

nodeLink.setNodeScaleTransform({ mode: "linear", domainMin: 0, domainMax: 1 });
unsubscribe();
```

## See Also
- [WasmGPU.createNodeLink](./wasmgpu-createnodelink.md)
- [NodeLink.setScaleTransform](./nodelink-setscaletransform.md)
- [NodeLink.applyScaleStats](./nodelink-applyscalestats.md)
- [NodeLink.colormap](./nodelink-colormap.md)
