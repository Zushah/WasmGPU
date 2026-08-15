# WasmGPU.createLatticeSpace

## Summary

`WasmGPU.createLatticeSpace` creates a regular 2D or 3D cell lattice. Flat data uses X-fastest indexing: `x + width * y` in 2D and `x + width * (y + height * z)` in 3D.

The renderer draws procedural quads for 2D cells and cubes for 3D cells. This is a surface-cell renderer, not raymarched participating-media volume rendering.

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

- Structure: [transform](./latticespace-transform.md), [dimensions](./latticespace-dimensions.md), [dimensionCount](./latticespace-dimensioncount.md), [cellCount](./latticespace-cellcount.md), [componentCount](./latticespace-componentcount.md), [name](./latticespace-name.md), [visible](./latticespace-visible.md)
- Layout and indexing: [origin](./latticespace-origin.md), [spacing](./latticespace-spacing.md), [cellScale](./latticespace-cellscale.md), [indexRange](./latticespace-indexrange.md), [drawCellCount](./latticespace-drawcellcount.md), [mapLinearIndexToCell](./latticespace-maplinearindextocell.md), [mapCellIndexToLinear](./latticespace-mapcellindextolinear.md)
- Appearance: [valueRange](./latticespace-valuerange.md), [opacity](./latticespace-opacity.md), [lit](./latticespace-lit.md), [colorMode](./latticespace-colormode.md), [colorSpace](./latticespace-colorspace.md), [solidColor](./latticespace-solidcolor.md), [colormap](./latticespace-colormap.md), [colormapStops](./latticespace-colormapstops.md), [blendMode](./latticespace-blendmode.md), [cullMode](./latticespace-cullmode.md), [depthWrite](./latticespace-depthwrite.md), [depthTest](./latticespace-depthtest.md), [occluderRevision](./latticespace-occluderrevision.md)
- Scaling and legends: [scaleTransform](./latticespace-scaletransform.md), [setScaleTransform](./latticespace-setscaletransform.md), [applyScaleStats](./latticespace-applyscalestats.md), [onVisualChange](./latticespace-onvisualchange.md), [getScaleSourceDescriptor](./latticespace-getscalesourcedescriptor.md), [getColormapKey](./latticespace-getcolormapkey.md), [getColormapForBinding](./latticespace-getcolormapforbinding.md)
- Data and masks: [hasData](./latticespace-hasdata.md), [hasMask](./latticespace-hasmask.md), [setData](./latticespace-setdata.md), [updateData](./latticespace-updatedata.md), [setDataBuffer](./latticespace-setdatabuffer.md), [markDataDirty](./latticespace-markdatadirty.md), [setMask](./latticespace-setmask.md), [updateMask](./latticespace-updatemask.md), [setMaskBuffer](./latticespace-setmaskbuffer.md), [markMaskDirty](./latticespace-markmaskdirty.md), [getCellRecord](./latticespace-getcellrecord.md), [dropCPUData](./latticespace-dropcpudata.md)
- Bounds and GPU integration: [dataBuffer](./latticespace-databuffer.md), [maskBuffer](./latticespace-maskbuffer.md), [uniformBuffer](./latticespace-uniformbuffer.md), [bindGroup](./latticespace-bindgroup.md), [bindGroupKey](./latticespace-bindgroupkey.md), [getLocalBounds](./latticespace-getlocalbounds.md), [getWorldBounds](./latticespace-getworldbounds.md), [getBounds](./latticespace-getbounds.md), [upload](./latticespace-upload.md), [getUniformBufferSize](./latticespace-getuniformbuffersize.md), [getUniformData](./latticespace-getuniformdata.md), [dirtyUniforms](./latticespace-dirtyuniforms.md), [markUniformsClean](./latticespace-markuniformsclean.md), [destroy](./latticespace-destroy.md)
- WebAssembly lifecycle: [refreshFromWasm](./latticespace-refreshfromwasm.md), [clearWasmSources](./latticespace-clearwasmsources.md)

## See Also

- [LatticeSpace.dimensions](./latticespace-dimensions.md)
- [LatticeSpace.setData](./latticespace-setdata.md)
- [LatticeSpace.setMask](./latticespace-setmask.md)
- [LatticeSpace.getCellRecord](./latticespace-getcellrecord.md)
- [LatticeSpace.destroy](./latticespace-destroy.md)
