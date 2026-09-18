# createOverlay.system#canvas

## Summary
createOverlay.system#canvas returns the HTML canvas associated with this overlay system. It is the projection reference for viewport size and screen-space mapping.

## Syntax
```ts
OverlaySystem.canvas: HTMLCanvasElement
const canvas = overlay.canvas;
```

## Parameters
This property does not take parameters.

## Returns
`HTMLCanvasElement` - Canvas bound to this overlay system.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const overlay = wgpu.createOverlay.system();
console.log(overlay.canvas === canvas);
```

## See Also
- [createOverlay.system#root](./createoverlay-system-root.md)
- [createOverlay.system#update](./createoverlay-system-update.md)
- [createOverlay.system#setView](./createoverlay-system-setview.md)
