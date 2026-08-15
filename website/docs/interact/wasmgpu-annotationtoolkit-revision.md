# WasmGPU.createAnnotation.toolkit().revision

## Summary
WasmGPU.createAnnotation.toolkit().revision returns the underlying annotation store revision counter.
The value increments whenever annotation content changes.

## Syntax
```ts
WasmGPU.createAnnotation.toolkit().revision: number
const revision = toolkit.revision;
```

## Parameters
This accessor does not take parameters.

## Returns
`number` - Current store revision number.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);
const toolkit = wgpu.createAnnotation.toolkit({ canvas });

const before = toolkit.revision;
toolkit.createMarker({ position: [0, 0, 0], pick: null });
console.log(before, toolkit.revision);
```

## See Also
- [WasmGPU.createAnnotation.toolkit().getAnnotations](./wasmgpu-annotationtoolkit-getannotations.md)
- [WasmGPU.createAnnotation.toolkit().onAnnotationsChange](./wasmgpu-annotationtoolkit-onannotationschange.md)
