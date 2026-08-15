# WasmGPU.createAnnotation.toolkit().cancel

## Summary
WasmGPU.createAnnotation.toolkit().cancel resets mode to `idle` and clears any staged anchors.
Use it to abort an in-progress distance/angle annotation gesture.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().cancel(): this
toolkit.cancel();
```

## Parameters
This API does not take parameters.

## Returns
`this` - Returns the same toolkit.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const toolkit = wgpu.createAnnotation.toolkit({ canvas });

toolkit.setMode("angle");
toolkit.cancel();
```

## See Also
- [WasmGPU.createAnnotation.toolkit().setMode](./wasmgpu-annotationtoolkit-setmode.md)
- [WasmGPU.createAnnotation.toolkit().pendingCount](./wasmgpu-annotationtoolkit-pendingcount.md)
