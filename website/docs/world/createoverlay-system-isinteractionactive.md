# createOverlay.system#isInteractionActive

## Summary
createOverlay.system#isInteractionActive indicates whether the system is currently in interaction mode. Layers can use this state to reduce expensive updates while users drag/zoom. Toggle it manually with `setInteractionActive` or via bound controls.

## Syntax
```ts
OverlaySystem.isInteractionActive: boolean
const active = overlay.isInteractionActive;
```

## Parameters
This property does not take parameters.

## Returns
`boolean` - `true` when interaction mode is active.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const overlay = wgpu.createOverlay.system();
overlay.setInteractionActive(true);
console.log(overlay.isInteractionActive);
```

## See Also
- [createOverlay.system#setInteractionActive](./createoverlay-system-setinteractionactive.md)
- [createOverlay.system#bindControls](./createoverlay-system-bindcontrols.md)
- [createOverlay.system#update](./createoverlay-system-update.md)
