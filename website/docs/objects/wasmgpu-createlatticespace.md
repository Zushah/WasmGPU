# WasmGPU.createLatticeSpace

## Summary

`WasmGPU.createLatticeSpace` creates a regular 2D or 3D cell lattice. Flat data uses X-fastest indexing: `x + width * y` in 2D and `x + width * (y + height * z)` in 3D.

Cells appear as procedural quads in 2D and cubes in 3D. This is surface-cell visualization, not raymarched participating-media volume rendering.

## Syntax

```ts
WasmGPU.createLatticeSpace(descriptor: LatticeSpaceDescriptor): LatticeSpace
const lattice = wgpu.createLatticeSpace(descriptor);
```

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `LatticeSpaceDescriptor` | Yes | Structural dimensions plus optional data, mask, layout, appearance, and ownership settings. |

## Returns

`LatticeSpace` - Scene object with immutable dimensions/component count and mutable layout, appearance, and data sources.

## Descriptor

```ts
type LatticeSpaceDimensions =
    | [number, number]
    | [number, number, number];

type LatticeSpaceIndex =
    | [number, number]
    | [number, number, number];

type LatticeSpaceIndexRange = {
    min: LatticeSpaceIndex;
    max: LatticeSpaceIndex;
};

type LatticeSpaceColorMode = "scalar" | "rgba" | "solid";
type LatticeSpaceColorSpace = "linear" | "srgb";
type LatticeSpaceColormap = BuiltinColormapName | "custom";
type LatticeSpaceVisualChangeKind = "scale" | "colormap" | "visual";

type LatticeSpaceDescriptor = {
    dimensions: LatticeSpaceDimensions;
    componentCount?: 1 | 2 | 3 | 4;
    data?: Float32Array;
    wasmData?: WasmMemoryView<Float32Array>;
    dataBuffer?: GPUBuffer | { buffer: GPUBuffer };
    mask?: Uint32Array;
    wasmMask?: WasmMemoryView<Uint32Array>;
    maskBuffer?: GPUBuffer | { buffer: GPUBuffer };
    wasmCapacity?: number;
    origin?: [number, number, number];
    spacing?: [number, number, number];
    cellScale?: number | [number, number, number];
    indexRange?: LatticeSpaceIndexRange;
    valueRange?: [number, number] | null;
    colorMode?: LatticeSpaceColorMode;
    colorSpace?: LatticeSpaceColorSpace;
    solidColor?: [number, number, number, number];
    colormap?: LatticeSpaceColormap | Colormap;
    colormapStops?: Color4[];
    scaleTransform?: ScaleTransformDescriptor;
    opacity?: number; lit?: boolean;
    blendMode?: BlendMode; cullMode?: CullMode;
    depthWrite?: boolean; depthTest?: boolean;
    visible?: boolean; name?: string;
    keepCPUData?: boolean; ownBuffers?: boolean;
};
```

`dimensions`, `dimensionCount`, `cellCount`, and `componentCount` are structural and do not change after construction. `data.length` must equal `cellCount * componentCount`; `mask.length` must equal `cellCount`.

`data`, `wasmData`, and `dataBuffer` are mutually exclusive. The same rule applies independently to `mask`, `wasmMask`, and `maskBuffer`. Data buffers store packed `f32` components and must cover `cellCount * componentCount` values; mask buffers store one `u32` per cell. External GPU buffers are borrowed unless `ownBuffers: true` transfers destruction responsibility; WebAssembly views always remain borrowed.

Defaults include `componentCount: 1`, `origin: [0, 0, 0]`, `spacing: [1, 1, 1]`, `cellScale: 1`, the full half-open index range, scalar/linear color interpretation, `"viridis"` colormap, full opacity, unlit shading, opaque blending, back-face culling, and enabled depth testing/writing. The `"rgba"` color mode requires four components.

In scalar mode, `scaleTransform` controls value-to-colormap normalization, while `valueRange` is an optional inclusive visibility filter. Direct RGBA data marked `"srgb"` is converted to linear color before lighting and output conversion.

## Example

```js
const lattice = wgpu.createLatticeSpace({
    dimensions: [64, 64],
    data: values,
    origin: [-3.2, -3.2, 0],
    spacing: [0.1, 0.1, 1],
    cellScale: 0.92,
    colorMode: "scalar",
    scaleTransform: { mode: "linear", domainMin: -1, domainMax: 1 },
    keepCPUData: true
});
scene.add(lattice);
```

## Member Reference

- Structure: [transform](./createlatticespace-transform.md), [dimensions](./createlatticespace-dimensions.md), [dimensionCount](./createlatticespace-dimensioncount.md), [cellCount](./createlatticespace-cellcount.md), [componentCount](./createlatticespace-componentcount.md), [name](./createlatticespace-name.md), [visible](./createlatticespace-visible.md)
- Layout and indexing: [origin](./createlatticespace-origin.md), [spacing](./createlatticespace-spacing.md), [cellScale](./createlatticespace-cellscale.md), [indexRange](./createlatticespace-indexrange.md), [drawCellCount](./createlatticespace-drawcellcount.md), [mapLinearIndexToCell](./createlatticespace-maplinearindextocell.md), [mapCellIndexToLinear](./createlatticespace-mapcellindextolinear.md)
- Appearance: [valueRange](./createlatticespace-valuerange.md), [opacity](./createlatticespace-opacity.md), [lit](./createlatticespace-lit.md), [colorMode](./createlatticespace-colormode.md), [colorSpace](./createlatticespace-colorspace.md), [solidColor](./createlatticespace-solidcolor.md), [colormap](./createlatticespace-colormap.md), [colormapStops](./createlatticespace-colormapstops.md), [blendMode](./createlatticespace-blendmode.md), [cullMode](./createlatticespace-cullmode.md), [depthWrite](./createlatticespace-depthwrite.md), [depthTest](./createlatticespace-depthtest.md), [occluderRevision](./createlatticespace-occluderrevision.md)
- Scaling and legends: [scaleTransform](./createlatticespace-scaletransform.md), [setScaleTransform](./createlatticespace-setscaletransform.md), [applyScaleStats](./createlatticespace-applyscalestats.md), [onVisualChange](./createlatticespace-onvisualchange.md), [getScaleSourceDescriptor](./createlatticespace-getscalesourcedescriptor.md), [getColormapKey](./createlatticespace-getcolormapkey.md), [getColormapForBinding](./createlatticespace-getcolormapforbinding.md)
- Data and masks: [hasData](./createlatticespace-hasdata.md), [hasMask](./createlatticespace-hasmask.md), [setData](./createlatticespace-setdata.md), [updateData](./createlatticespace-updatedata.md), [setDataBuffer](./createlatticespace-setdatabuffer.md), [markDataDirty](./createlatticespace-markdatadirty.md), [setMask](./createlatticespace-setmask.md), [updateMask](./createlatticespace-updatemask.md), [setMaskBuffer](./createlatticespace-setmaskbuffer.md), [markMaskDirty](./createlatticespace-markmaskdirty.md), [getCellRecord](./createlatticespace-getcellrecord.md), [dropCPUData](./createlatticespace-dropcpudata.md)
- Bounds and GPU integration: [dataBuffer](./createlatticespace-databuffer.md), [maskBuffer](./createlatticespace-maskbuffer.md), [uniformBuffer](./createlatticespace-uniformbuffer.md), [bindGroup](./createlatticespace-bindgroup.md), [bindGroupKey](./createlatticespace-bindgroupkey.md), [getLocalBounds](./createlatticespace-getlocalbounds.md), [getWorldBounds](./createlatticespace-getworldbounds.md), [getBounds](./createlatticespace-getbounds.md), [upload](./createlatticespace-upload.md), [getUniformBufferSize](./createlatticespace-getuniformbuffersize.md), [getUniformData](./createlatticespace-getuniformdata.md), [dirtyUniforms](./createlatticespace-dirtyuniforms.md), [markUniformsClean](./createlatticespace-markuniformsclean.md), [destroy](./createlatticespace-destroy.md)
- WebAssembly lifecycle: [refreshFromWasm](./createlatticespace-refreshfromwasm.md), [clearWasmSources](./createlatticespace-clearwasmsources.md)

## See Also

- [createLatticeSpace#dimensions](./createlatticespace-dimensions.md)
- [createLatticeSpace#setData](./createlatticespace-setdata.md)
- [createLatticeSpace#setMask](./createlatticespace-setmask.md)
- [createLatticeSpace#getCellRecord](./createlatticespace-getcellrecord.md)
- [createLatticeSpace#destroy](./createlatticespace-destroy.md)
