# geometry#destroy

## Summary
geometry#destroy delegates to the reference-counted `release()` lifecycle. When the final reference is released, it destroys geometry-owned GPU buffers and marks the geometry destroyed. It never frees borrowed external Wasm allocations.

Call `clearWasmSources()` separately if a still-live shared geometry should detach its external sources before the final release. Calling `destroy()` after the geometry has already reached zero references throws.

## Syntax
```ts
Geometry.destroy(): void
geometry.destroy();
```

## Parameters
None.

## Returns
`void`

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const geometry = wgpu.geometry.sphere(1, 24, 16);
geometry.destroy();
```

## See Also
- [geometry#clearWasmSources](./geometry-clearwasmsources.md)
- [geometry#setWasmPositions](./geometry-setwasmpositions.md)
- [geometry#upload](./geometry-upload.md)
