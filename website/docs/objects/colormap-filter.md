# Colormap.filter

## Summary
Colormap.filter reads the current `filter` value from this Colormap instance. Use it to inspect runtime state without mutating resources.

## Syntax
```ts
Colormap.filter: ColormapFilter
const value = colormap.filter;
```

## Parameters
This API does not take parameters.

## Returns
`ColormapFilter` - Current accessor value exposed by the runtime object.

## Type Details
### ColormapFilter

```ts
type ColormapFilter = "linear" | "nearest";
```

## Example
```js
const canvas = document.querySelector("canvas");
const wgpu = await WasmGPU.create(canvas);

const colormap = wgpu.colormap.viridis();
const value = colormap.filter;
console.log(value);
```

## See Also
- [Colormap.canSampleCPU](./colormap-cansamplecpu.md)
- [Colormap.getGPUResources](./colormap-getgpuresources.md)
- [Colormap.getRGBA8LinearLUT](./colormap-getrgba8linearlut.md)
- [Colormap.sampleCPU](./colormap-samplecpu.md)
- [Colormap.toUniformStops](./colormap-touniformstops.md)
- [Colormap.width](./colormap-width.md)
