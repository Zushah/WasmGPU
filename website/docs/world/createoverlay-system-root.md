# createOverlay.system#root

## Summary
createOverlay.system#root returns the overlay root `div` used to host all layer DOM content. Layers attach their own containers beneath this node. You can style the root through CSS class/z-index options.

## Syntax
```ts
OverlaySystem.root: HTMLDivElement
const root = overlay.root;
```

## Parameters
This property does not take parameters.

## Returns
`HTMLDivElement` - Root overlay container.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const overlay = wgpu.createOverlay.system({ className: "wasmgpu-overlay-root" });
overlay.root.style.pointerEvents = "none";
```

## See Also
- [createOverlay.system#parent](./createoverlay-system-parent.md)
- [createOverlay.system#addLayer](./createoverlay-system-addlayer.md)
- [createOverlay.system#destroy](./createoverlay-system-destroy.md)
