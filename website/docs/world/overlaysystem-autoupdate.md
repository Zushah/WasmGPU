# OverlaySystem.autoUpdate

## Summary
OverlaySystem.autoUpdate indicates whether the system schedules updates automatically using requestAnimationFrame after invalidation. When false, call `overlay.update(...)` manually.

## Syntax
```ts
OverlaySystem.autoUpdate: boolean
const enabled = overlay.autoUpdate;
```

## Parameters
This property does not take parameters.

## Returns
`boolean` - Whether automatic RAF-driven updates are enabled.

## Type Details
```ts
// Read-only boolean property.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const overlay = wgpu.createOverlay.system({ autoUpdate: false });
overlay.addLayer(wgpu.createOverlay.axisTriad());
overlay.update({ force: true });
console.log(overlay.autoUpdate);
```

## See Also
- [OverlaySystem.invalidate](./overlaysystem-invalidate.md)
- [OverlaySystem.update](./overlaysystem-update.md)
- [WasmGPU.createOverlay.system](./wasmgpu-createoverlay-system.md)
