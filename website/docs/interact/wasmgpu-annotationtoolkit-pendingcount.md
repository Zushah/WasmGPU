# WasmGPU.createAnnotation.toolkit().pendingCount

## Summary
WasmGPU.createAnnotation.toolkit().pendingCount reports how many staged anchors are currently buffered.
Distance mode stages up to 2 anchors, angle mode stages up to 3 anchors.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().pendingCount: number
const count = toolkit.pendingCount;
```

## Parameters
This accessor does not take parameters.

## Returns
`number` - Number of currently staged anchors.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const toolkit = wgpu.createAnnotation.toolkit({ canvas });

toolkit.setMode("distance");
console.log(toolkit.pendingCount);
```

## See Also
- [WasmGPU.createAnnotation.toolkit().setMode](./wasmgpu-annotationtoolkit-setmode.md)
- [WasmGPU.createAnnotation.toolkit().onStagingChange](./wasmgpu-annotationtoolkit-onstagingchange.md)
