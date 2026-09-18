# createOverlay.system#parent

## Summary
createOverlay.system#parent returns the DOM element that owns the overlay root. This is either the configured parent or a default derived from the canvas context.

## Syntax
```ts
OverlaySystem.parent: HTMLElement
const parent = overlay.parent;
```

## Parameters
This property does not take parameters.

## Returns
`HTMLElement` - Parent element containing the overlay root.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const overlay = wgpu.createOverlay.system({ parent: document.body });
console.log(overlay.parent.tagName);
```

## See Also
- [createOverlay.system#root](./createoverlay-system-root.md)
- [createOverlay.system#canvas](./createoverlay-system-canvas.md)
- [createOverlay.system](./createoverlay-system.md)
