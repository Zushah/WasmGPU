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

- Structure: [transform](./wasmgpu-objects-latticespace-transform.md), [dimensions](./wasmgpu-objects-latticespace-dimensions.md), [dimensionCount](./wasmgpu-objects-latticespace-dimensioncount.md), [cellCount](./wasmgpu-objects-latticespace-cellcount.md), [componentCount](./wasmgpu-objects-latticespace-componentcount.md), [name](./wasmgpu-objects-latticespace-name.md), [visible](./wasmgpu-objects-latticespace-visible.md)
- Layout and indexing: [origin](./wasmgpu-objects-latticespace-origin.md), [spacing](./wasmgpu-objects-latticespace-spacing.md), [cellScale](./wasmgpu-objects-latticespace-cellscale.md), [indexRange](./wasmgpu-objects-latticespace-indexrange.md), [drawCellCount](./wasmgpu-objects-latticespace-drawcellcount.md), [mapLinearIndexToCell](./wasmgpu-objects-latticespace-maplinearindextocell.md), [mapCellIndexToLinear](./wasmgpu-objects-latticespace-mapcellindextolinear.md)
- Appearance: [valueRange](./wasmgpu-objects-latticespace-valuerange.md), [opacity](./wasmgpu-objects-latticespace-opacity.md), [lit](./wasmgpu-objects-latticespace-lit.md), [colorMode](./wasmgpu-objects-latticespace-colormode.md), [colorSpace](./wasmgpu-objects-latticespace-colorspace.md), [solidColor](./wasmgpu-objects-latticespace-solidcolor.md), [colormap](./wasmgpu-objects-latticespace-colormap.md), [colormapStops](./wasmgpu-objects-latticespace-colormapstops.md), [blendMode](./wasmgpu-objects-latticespace-blendmode.md), [cullMode](./wasmgpu-objects-latticespace-cullmode.md), [depthWrite](./wasmgpu-objects-latticespace-depthwrite.md), [depthTest](./wasmgpu-objects-latticespace-depthtest.md), [occluderRevision](./wasmgpu-objects-latticespace-occluderrevision.md)
- Scaling and legends: [scaleTransform](./wasmgpu-objects-latticespace-scaletransform.md), [setScaleTransform](./wasmgpu-objects-latticespace-setscaletransform.md), [applyScaleStats](./wasmgpu-objects-latticespace-applyscalestats.md), [onVisualChange](./wasmgpu-objects-latticespace-onvisualchange.md), [getScaleSourceDescriptor](./wasmgpu-objects-latticespace-getscalesourcedescriptor.md), [getColormapKey](./wasmgpu-objects-latticespace-getcolormapkey.md), [getColormapForBinding](./wasmgpu-objects-latticespace-getcolormapforbinding.md)
- Data and masks: [hasData](./wasmgpu-objects-latticespace-hasdata.md), [hasMask](./wasmgpu-objects-latticespace-hasmask.md), [setData](./wasmgpu-objects-latticespace-setdata.md), [updateData](./wasmgpu-objects-latticespace-updatedata.md), [setDataBuffer](./wasmgpu-objects-latticespace-setdatabuffer.md), [markDataDirty](./wasmgpu-objects-latticespace-markdatadirty.md), [setMask](./wasmgpu-objects-latticespace-setmask.md), [updateMask](./wasmgpu-objects-latticespace-updatemask.md), [setMaskBuffer](./wasmgpu-objects-latticespace-setmaskbuffer.md), [markMaskDirty](./wasmgpu-objects-latticespace-markmaskdirty.md), [getCellRecord](./wasmgpu-objects-latticespace-getcellrecord.md), [dropCPUData](./wasmgpu-objects-latticespace-dropcpudata.md)
- Bounds and GPU integration: [dataBuffer](./wasmgpu-objects-latticespace-databuffer.md), [maskBuffer](./wasmgpu-objects-latticespace-maskbuffer.md), [uniformBuffer](./wasmgpu-objects-latticespace-uniformbuffer.md), [bindGroup](./wasmgpu-objects-latticespace-bindgroup.md), [bindGroupKey](./wasmgpu-objects-latticespace-bindgroupkey.md), [getLocalBounds](./wasmgpu-objects-latticespace-getlocalbounds.md), [getWorldBounds](./wasmgpu-objects-latticespace-getworldbounds.md), [getBounds](./wasmgpu-objects-latticespace-getbounds.md), [upload](./wasmgpu-objects-latticespace-upload.md), [getUniformBufferSize](./wasmgpu-objects-latticespace-getuniformbuffersize.md), [getUniformData](./wasmgpu-objects-latticespace-getuniformdata.md), [dirtyUniforms](./wasmgpu-objects-latticespace-dirtyuniforms.md), [markUniformsClean](./wasmgpu-objects-latticespace-markuniformsclean.md), [destroy](./wasmgpu-objects-latticespace-destroy.md)
- WebAssembly lifecycle: [refreshFromWasm](./wasmgpu-objects-latticespace-refreshfromwasm.md), [clearWasmSources](./wasmgpu-objects-latticespace-clearwasmsources.md)

## See Also

- [LatticeSpace.dimensions](./wasmgpu-objects-latticespace-dimensions.md)
- [LatticeSpace.setData](./wasmgpu-objects-latticespace-setdata.md)
- [LatticeSpace.setMask](./wasmgpu-objects-latticespace-setmask.md)
- [LatticeSpace.getCellRecord](./wasmgpu-objects-latticespace-getcellrecord.md)
- [LatticeSpace.destroy](./wasmgpu-objects-latticespace-destroy.md)
