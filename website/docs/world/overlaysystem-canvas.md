# OverlaySystem.canvas

## Summary
OverlaySystem.canvas returns the HTML canvas associated with this overlay system. It is the projection reference for viewport size and screen-space mapping.

## Syntax
```ts
OverlaySystem.canvas: HTMLCanvasElement
const canvas = overlay.canvas;
```

## Parameters
This property does not take parameters.

## Returns
`HTMLCanvasElement` - Canvas bound to this overlay system.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const overlay = wgpu.createOverlay.system();
console.log(overlay.canvas === canvas);
```

## See Also
- [OverlaySystem.root](./overlaysystem-root.md)
- [OverlaySystem.update](./overlaysystem-update.md)
- [OverlaySystem.setView](./overlaysystem-setview.md)
