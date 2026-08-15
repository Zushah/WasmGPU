# OverlaySystem.parent

## Summary
OverlaySystem.parent returns the DOM element that owns the overlay root. This is either the configured parent or a default derived from the canvas context.

## Syntax
```ts
OverlaySystem.parent: HTMLElement
const parent = overlay.parent;
```

## Parameters
This property does not take parameters.

## Returns
`HTMLElement` - Parent element containing the overlay root.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const overlay = wgpu.createOverlay.system({ parent: document.body });
console.log(overlay.parent.tagName);
```

## See Also
- [OverlaySystem.root](./overlaysystem-root.md)
- [OverlaySystem.canvas](./overlaysystem-canvas.md)
- [WasmGPU.createOverlay.system](./wasmgpu-createoverlay-system.md)
