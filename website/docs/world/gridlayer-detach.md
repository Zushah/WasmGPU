# GridLayer.detach

## Summary
GridLayer.detach removes grid DOM nodes and clears internal pools. OverlaySystem calls this automatically when layers are removed or cleared.

## Syntax
```ts
GridLayer.detach(): void
layer.detach();
```

## Parameters
This method does not take parameters.

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
overlay.addLayer(grid);
overlay.removeLayer("grid-main"); // detach called internally
```

## See Also
- [GridLayer.attach](./gridlayer-attach.md)
- [OverlaySystem.removeLayer](./overlaysystem-removelayer.md)
- [OverlaySystem.clearLayers](./overlaysystem-clearlayers.md)
