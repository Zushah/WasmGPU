# WasmGPU.createSplatField

## Summary

`WasmGPU.createSplatField` creates a transparent Gaussian-splat object from CPU arrays, packed GPU buffers, or borrowed WebAssembly views. Each splat has a center, rotation quaternion, three-axis scale, opacity, and either direct color or spherical-harmonic coefficients.

Splat fields are camera-depth sorted on the GPU before transparent rendering. They support scene bounds and picking, but do not participate in render-time occlusion culling.

## Syntax

```ts
WasmGPU.createSplatField(descriptor: SplatFieldDescriptor): SplatField
const splats = wgpu.createSplatField(descriptor);
```

## Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `descriptor` | `SplatFieldDescriptor` | Yes | CPU-array, packed GPU-buffer, or borrowed WebAssembly source configuration. |

## Returns

`SplatField` - Scene object containing the resolved splat count, appearance state, bounds, and source-family resources.

## Descriptor

```ts
type SplatFieldSHDegree = 0 | 1 | 2 | 3;
type SplatFieldColorSpace = "linear" | "srgb";

type SplatFieldDescriptor = {
    positions?: Float32Array; rotations?: Float32Array;
    scales?: Float32Array; opacities?: Float32Array;
    colors?: Float32Array;
    sh0?: Float32Array; sh1?: Float32Array;
    sh2?: Float32Array; sh3?: Float32Array;
    shDegree?: SplatFieldSHDegree;
    centerOpacityBuffer?: GPUBuffer | { buffer: GPUBuffer };
    rotationBuffer?: GPUBuffer | { buffer: GPUBuffer };
    scaleBuffer?: GPUBuffer | { buffer: GPUBuffer };
    colorBuffer?: GPUBuffer | { buffer: GPUBuffer };
    shBuffer?: GPUBuffer | { buffer: GPUBuffer };
    wasmCenterOpacity?: WasmMemoryView<Float32Array>;
    wasmRotation?: WasmMemoryView<Float32Array>;
    wasmScale?: WasmMemoryView<Float32Array>;
    wasmColor?: WasmMemoryView<Float32Array>;
    wasmSphericalHarmonics?: WasmMemoryView<Float32Array>;
    wasmCapacity?: number;
    splatCount?: number;
    colorSpace?: SplatFieldColorSpace;
    opacityScale?: number;
    keepCPUData?: boolean;
    ownBuffers?: boolean;
    boundsMin?: [number, number, number];
    boundsMax?: [number, number, number];
    boundsCenter?: [number, number, number];
    boundsRadius?: number;
    ndShape?: number[];
    visible?: boolean;
    name?: string;
};
```

CPU `positions` and `scales` use three floats per splat, `rotations` use four, and `opacities` use one. Direct `colors` may contain RGB or RGBA tuples. Supplying spherical harmonics requires `sh0`; higher degree arrays must be complete through the selected degree. Direct colors and spherical harmonics are mutually exclusive.

CPU arrays, external GPU buffers, and WebAssembly views are three mutually exclusive source families. Within the CPU family, all supplied array counts must agree; omitted positions, rotations, scales, opacities, and colors default to zero centers, identity rotations, unit scales, full opacity, and white. `colorSpace` defaults to `"linear"`, `opacityScale` to `1`, `visible` to `true`, and CPU snapshots are dropped after upload unless `keepCPUData` is enabled.

External GPU buffers require `centerOpacityBuffer`, `rotationBuffer`, `scaleBuffer`, and `splatCount`. `splatCount` must be a non-negative signed 32-bit integer. The buffers are borrowed unless `ownBuffers: true` transfers destruction responsibility. Packed center/opacity, rotation, scale, and direct-color buffers use one `vec4<f32>` per splat. When neither direct color nor SH data is provided, splats use opaque white. `shBuffer` stores flat RGB triples for all coefficients of the selected degree and requires `shDegree`.

WebAssembly construction likewise requires center/opacity, rotation, and scale sources; source memory remains borrowed. See the dedicated WebAssembly page for refresh and capacity rules. Explicit box bounds require both `boundsMin` and `boundsMax`; sphere bounds use `boundsCenter` and `boundsRadius`.

## Example

```js
const splats = wgpu.createSplatField({
    positions: new Float32Array([0, 0, 0, 1, 0, 0]),
    rotations: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1]),
    scales: new Float32Array([0.2, 0.1, 0.1, 0.15, 0.15, 0.3]),
    opacities: new Float32Array([0.9, 0.7]),
    colors: new Float32Array([1, 0.3, 0.1, 0.2, 0.6, 1]),
    colorSpace: "srgb",
    keepCPUData: true
});
scene.add(splats);
```

## Member Reference

- Identity and layout: [transform](./createsplatfield-transform.md), [name](./createsplatfield-name.md), [visible](./createsplatfield-visible.md), [splatCount](./createsplatfield-splatcount.md), [ndShape](./createsplatfield-ndshape.md), [mapLinearIndexToNd](./createsplatfield-maplinearindextond.md)
- Color: [colorSpace](./createsplatfield-colorspace.md), [opacityScale](./createsplatfield-opacityscale.md), [usesSphericalHarmonics](./createsplatfield-usessphericalharmonics.md), [shDegree](./createsplatfield-shdegree.md), [externalColorBufferSrgb](./createsplatfield-externalcolorbuffersrgb.md)
- Bounds: [boundsMin](./createsplatfield-boundsmin.md), [boundsMax](./createsplatfield-boundsmax.md), [boundsCenter](./createsplatfield-boundscenter.md), [boundsRadius](./createsplatfield-boundsradius.md), [computeBoundsFromCPUData](./createsplatfield-computeboundsfromcpudata.md), [getLocalBounds](./createsplatfield-getlocalbounds.md), [getWorldBounds](./createsplatfield-getworldbounds.md), [getBounds](./createsplatfield-getbounds.md)
- Records and lifetime: [getSplatRecord](./createsplatfield-getsplatrecord.md), [getSphericalHarmonicsRecord](./createsplatfield-getsphericalharmonicsrecord.md), [dropCPUData](./createsplatfield-dropcpudata.md), [destroy](./createsplatfield-destroy.md)
- GPU integration: [centerOpacityBuffer](./createsplatfield-centeropacitybuffer.md), [rotationBuffer](./createsplatfield-rotationbuffer.md), [scaleBuffer](./createsplatfield-scalebuffer.md), [colorBuffer](./createsplatfield-colorbuffer.md), [shBuffer](./createsplatfield-shbuffer.md), [uniformBuffer](./createsplatfield-uniformbuffer.md), [bindGroup](./createsplatfield-bindgroup.md), [bindGroupKey](./createsplatfield-bindgroupkey.md), [upload](./createsplatfield-upload.md), [getUniformBufferSize](./createsplatfield-getuniformbuffersize.md), [getUniformData](./createsplatfield-getuniformdata.md), [dirtyUniforms](./createsplatfield-dirtyuniforms.md), [markUniformsClean](./createsplatfield-markuniformsclean.md)
- WebAssembly sources: [setWasmCenterOpacity](./createsplatfield-setwasmcenteropacity.md), [setWasmRotation](./createsplatfield-setwasmrotation.md), [setWasmScale](./createsplatfield-setwasmscale.md), [setWasmColor](./createsplatfield-setwasmcolor.md), [setWasmSphericalHarmonics](./createsplatfield-setwasmsphericalharmonics.md), [setWasmPackedData](./createsplatfield-setwasmpackeddata.md), [refreshFromWasm](./createsplatfield-refreshfromwasm.md), [clearWasmSources](./createsplatfield-clearwasmsources.md)

## See Also

- [createSplatField#splatCount](./createsplatfield-splatcount.md)
- [createSplatField#getSplatRecord](./createsplatfield-getsplatrecord.md)
- [createSplatField#setWasmPackedData](./createsplatfield-setwasmpackeddata.md)
- [createSplatField#upload](./createsplatfield-upload.md)
- [createSplatField#destroy](./createsplatfield-destroy.md)
- [gltf.import](./gltf-import.md)
