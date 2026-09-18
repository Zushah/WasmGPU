# createOverlay.system#interactionThrottleMs

## Summary
createOverlay.system#interactionThrottleMs is the active-interaction update throttle interval in milliseconds. While interaction is active, updates may be skipped until this interval elapses unless `force` is used.

## Syntax
```ts
OverlaySystem.interactionThrottleMs: number
const ms = overlay.interactionThrottleMs;
```

## Parameters
This property does not take parameters.

## Returns
`number` - Interaction update throttle interval in milliseconds.

## Type Details
```ts
// Read-only numeric property.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const overlay = wgpu.createOverlay.system({ interactionThrottleMs: 20 });
console.log(overlay.interactionThrottleMs);
```

## See Also
- [createOverlay.system#isInteractionActive](./createoverlay-system-isinteractionactive.md)
- [createOverlay.system#setInteractionActive](./createoverlay-system-setinteractionactive.md)
- [createOverlay.system#update](./createoverlay-system-update.md)
