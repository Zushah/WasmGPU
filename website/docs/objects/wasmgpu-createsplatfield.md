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

External GPU buffers require `centerOpacityBuffer`, `rotationBuffer`, `scaleBuffer`, and `splatCount`. They are borrowed unless `ownBuffers: true` transfers destruction responsibility. Packed center/opacity, rotation, scale, and direct-color buffers use one `vec4<f32>` per splat. When neither direct color nor SH data is provided, the object creates an internal white color buffer. `shBuffer` stores flat RGB triples for all coefficients of the selected degree and requires `shDegree`.

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

- Identity and layout: [transform](./splatfield-transform.md), [name](./splatfield-name.md), [visible](./splatfield-visible.md), [splatCount](./splatfield-splatcount.md), [ndShape](./splatfield-ndshape.md), [mapLinearIndexToNd](./splatfield-maplinearindextond.md)
- Color: [colorSpace](./splatfield-colorspace.md), [opacityScale](./splatfield-opacityscale.md), [usesSphericalHarmonics](./splatfield-usessphericalharmonics.md), [shDegree](./splatfield-shdegree.md), [externalColorBufferSrgb](./splatfield-externalcolorbuffersrgb.md)
- Bounds: [boundsMin](./splatfield-boundsmin.md), [boundsMax](./splatfield-boundsmax.md), [boundsCenter](./splatfield-boundscenter.md), [boundsRadius](./splatfield-boundsradius.md), [computeBoundsFromCPUData](./splatfield-computeboundsfromcpudata.md), [getLocalBounds](./splatfield-getlocalbounds.md), [getWorldBounds](./splatfield-getworldbounds.md), [getBounds](./splatfield-getbounds.md)
- Records and lifetime: [getSplatRecord](./splatfield-getsplatrecord.md), [getSphericalHarmonicsRecord](./splatfield-getsphericalharmonicsrecord.md), [dropCPUData](./splatfield-dropcpudata.md), [destroy](./splatfield-destroy.md)
- GPU integration: [centerOpacityBuffer](./splatfield-centeropacitybuffer.md), [rotationBuffer](./splatfield-rotationbuffer.md), [scaleBuffer](./splatfield-scalebuffer.md), [colorBuffer](./splatfield-colorbuffer.md), [shBuffer](./splatfield-shbuffer.md), [uniformBuffer](./splatfield-uniformbuffer.md), [bindGroup](./splatfield-bindgroup.md), [bindGroupKey](./splatfield-bindgroupkey.md), [upload](./splatfield-upload.md), [getUniformBufferSize](./splatfield-getuniformbuffersize.md), [getUniformData](./splatfield-getuniformdata.md), [dirtyUniforms](./splatfield-dirtyuniforms.md), [markUniformsClean](./splatfield-markuniformsclean.md)
- WebAssembly sources: [setWasmCenterOpacity](./splatfield-setwasmcenteropacity.md), [setWasmRotation](./splatfield-setwasmrotation.md), [setWasmScale](./splatfield-setwasmscale.md), [setWasmColor](./splatfield-setwasmcolor.md), [setWasmSphericalHarmonics](./splatfield-setwasmsphericalharmonics.md), [setWasmPackedData](./splatfield-setwasmpackeddata.md), [refreshFromWasm](./splatfield-refreshfromwasm.md), [clearWasmSources](./splatfield-clearwasmsources.md)

## See Also

- [SplatField.splatCount](./splatfield-splatcount.md)
- [SplatField.getSplatRecord](./splatfield-getsplatrecord.md)
- [SplatField.setWasmPackedData](./splatfield-setwasmpackeddata.md)
- [SplatField.upload](./splatfield-upload.md)
- [SplatField.destroy](./splatfield-destroy.md)
- [WasmGPU.gltf.import](./wasmgpu-gltf-import.md)
