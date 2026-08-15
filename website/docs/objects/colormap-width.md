# Colormap.width

## Summary
Colormap.width reads the current `width` value from this Colormap instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
Colormap.width: number
const value = colormap.width;
```

## Parameters
This API does not take parameters.

## Returns
`number` - Numeric scalar result produced by this operation.

## Type Details
```ts
// No additional descriptor expansion is required for this signature.
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const colormap = wgpu.colormap.viridis();
const value = colormap.width;
console.log(value);
```

## See Also
- [Colormap.canSampleCPU](./colormap-cansamplecpu.md)
- [Colormap.filter](./colormap-filter.md)
- [Colormap.getGPUResources](./colormap-getgpuresources.md)
- [Colormap.getRGBA8LinearLUT](./colormap-getrgba8linearlut.md)
- [Colormap.sampleCPU](./colormap-samplecpu.md)
- [Colormap.toUniformStops](./colormap-touniformstops.md)
