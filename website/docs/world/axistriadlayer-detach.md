# AxisTriadLayer.detach

## Summary
AxisTriadLayer.detach removes the layer's DOM elements and clears internal node references. This is called automatically by `OverlaySystem.removeLayer` and `OverlaySystem.clearLayers`.

## Syntax
```ts
AxisTriadLayer.detach(): void
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
const triad = wgpu.createOverlay.axisTriad({ id: "triad-main" });
overlay.addLayer(triad);
overlay.removeLayer("triad-main"); // calls detach internally
```

## See Also
- [AxisTriadLayer.attach](./axistriadlayer-attach.md)
- [OverlaySystem.removeLayer](./overlaysystem-removelayer.md)
- [OverlaySystem.clearLayers](./overlaysystem-clearlayers.md)
