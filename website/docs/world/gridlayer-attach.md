# GridLayer.attach

## Summary
GridLayer.attach creates and mounts the grid layer container and node pools under the overlay root. This is usually managed by `OverlaySystem.addLayer`.

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

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const overlay = wgpu.createOverlay.system();
const grid = wgpu.createOverlay.grid({ id: "grid-main" });
overlay.addLayer(grid); // attach called internally
```

## See Also
- [GridLayer.detach](./gridlayer-detach.md)
- [GridLayer.update](./gridlayer-update.md)
- [OverlaySystem.addLayer](./overlaysystem-addlayer.md)
