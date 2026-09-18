# colormap#getRGBA8LinearLUT

## Summary
colormap#getRGBA8LinearLUT returns a copy of the CPU-side lookup table as packed linear-space RGBA8 bytes. Mutating the result does not change the colormap. The method throws for an external GPU-only colormap.

## Syntax
```ts
Colormap.getRGBA8LinearLUT(): Uint8Array
const result = colormap.getRGBA8LinearLUT();
```

## Returns
`Uint8Array` - A new `width * 4` byte array in RGBA order.

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const colormap = wgpu.colormap.viridis();
const lut = colormap.getRGBA8LinearLUT();
console.log(lut.length === colormap.width * 4); // true
```

## See Also
- [colormap#canSampleCPU](./colormap-cansamplecpu.md)
- [colormap#filter](./colormap-filter.md)
- [colormap#getGPUResources](./colormap-getgpuresources.md)
- [colormap#sampleCPU](./colormap-samplecpu.md)
- [colormap#toUniformStops](./colormap-touniformstops.md)
- [colormap#width](./colormap-width.md)
