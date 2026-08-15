# Colormap.getRGBA8LinearLUT

## Summary
Colormap.getRGBA8LinearLUT returns the current rgba8 linear lut value derived from this Colormap runtime state.

## Syntax
```ts
Colormap.getRGBA8LinearLUT(): Uint8Array
const result = colormap.getRGBA8LinearLUT();
```

## Parameters
This API does not take parameters.

## Returns
`Uint8Array` - Array-like result returned by this operation.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const colormap = wgpu.colormap.viridis();
const result = colormap.getRGBA8LinearLUT();
console.log(result);
```

## See Also
- [Colormap.canSampleCPU](./colormap-cansamplecpu.md)
- [Colormap.filter](./colormap-filter.md)
- [Colormap.getGPUResources](./colormap-getgpuresources.md)
- [Colormap.sampleCPU](./colormap-samplecpu.md)
- [Colormap.toUniformStops](./colormap-touniformstops.md)
- [Colormap.width](./colormap-width.md)
