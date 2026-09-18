# createOverlay.grid#attach

## Summary
createOverlay.grid#attach mounts the grid layer under an overlay root. This is normally managed by `OverlaySystem.addLayer`. For direct use, pair each `attach()` with `detach()` before attaching the layer to another root.

## Syntax
```ts
GridLayer.attach(root: HTMLDivElement): void
layer.attach(root);
```

## Parameters
| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `root` | `HTMLDivElement` | Yes | Overlay root where grid DOM nodes are allocated. |

## Returns
`void` - No return value.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const overlay = wgpu.createOverlay.system();
const grid = wgpu.createOverlay.grid({ id: "grid-main" });
overlay.addLayer(grid);
```

## See Also
- [createOverlay.grid#detach](./createoverlay-grid-detach.md)
- [createOverlay.grid#update](./createoverlay-grid-update.md)
- [createOverlay.system#addLayer](./createoverlay-system-addlayer.md)
