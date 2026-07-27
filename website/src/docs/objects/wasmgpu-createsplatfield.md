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

- Identity and layout: [transform](./wasmgpu-objects-splatfield-transform.md), [name](./wasmgpu-objects-splatfield-name.md), [visible](./wasmgpu-objects-splatfield-visible.md), [splatCount](./wasmgpu-objects-splatfield-splatcount.md), [ndShape](./wasmgpu-objects-splatfield-ndshape.md), [mapLinearIndexToNd](./wasmgpu-objects-splatfield-maplinearindextond.md)
- Color: [colorSpace](./wasmgpu-objects-splatfield-colorspace.md), [opacityScale](./wasmgpu-objects-splatfield-opacityscale.md), [usesSphericalHarmonics](./wasmgpu-objects-splatfield-usessphericalharmonics.md), [shDegree](./wasmgpu-objects-splatfield-shdegree.md), [externalColorBufferSrgb](./wasmgpu-objects-splatfield-externalcolorbuffersrgb.md)
- Bounds: [boundsMin](./wasmgpu-objects-splatfield-boundsmin.md), [boundsMax](./wasmgpu-objects-splatfield-boundsmax.md), [boundsCenter](./wasmgpu-objects-splatfield-boundscenter.md), [boundsRadius](./wasmgpu-objects-splatfield-boundsradius.md), [computeBoundsFromCPUData](./wasmgpu-objects-splatfield-computeboundsfromcpudata.md), [getLocalBounds](./wasmgpu-objects-splatfield-getlocalbounds.md), [getWorldBounds](./wasmgpu-objects-splatfield-getworldbounds.md), [getBounds](./wasmgpu-objects-splatfield-getbounds.md)
- Records and lifetime: [getSplatRecord](./wasmgpu-objects-splatfield-getsplatrecord.md), [getSphericalHarmonicsRecord](./wasmgpu-objects-splatfield-getsphericalharmonicsrecord.md), [dropCPUData](./wasmgpu-objects-splatfield-dropcpudata.md), [destroy](./wasmgpu-objects-splatfield-destroy.md)
- GPU integration: [centerOpacityBuffer](./wasmgpu-objects-splatfield-centeropacitybuffer.md), [rotationBuffer](./wasmgpu-objects-splatfield-rotationbuffer.md), [scaleBuffer](./wasmgpu-objects-splatfield-scalebuffer.md), [colorBuffer](./wasmgpu-objects-splatfield-colorbuffer.md), [shBuffer](./wasmgpu-objects-splatfield-shbuffer.md), [uniformBuffer](./wasmgpu-objects-splatfield-uniformbuffer.md), [bindGroup](./wasmgpu-objects-splatfield-bindgroup.md), [bindGroupKey](./wasmgpu-objects-splatfield-bindgroupkey.md), [upload](./wasmgpu-objects-splatfield-upload.md), [getUniformBufferSize](./wasmgpu-objects-splatfield-getuniformbuffersize.md), [getUniformData](./wasmgpu-objects-splatfield-getuniformdata.md), [dirtyUniforms](./wasmgpu-objects-splatfield-dirtyuniforms.md), [markUniformsClean](./wasmgpu-objects-splatfield-markuniformsclean.md)
- WebAssembly sources: [setWasmCenterOpacity](./wasmgpu-objects-splatfield-setwasmcenteropacity.md), [setWasmRotation](./wasmgpu-objects-splatfield-setwasmrotation.md), [setWasmScale](./wasmgpu-objects-splatfield-setwasmscale.md), [setWasmColor](./wasmgpu-objects-splatfield-setwasmcolor.md), [setWasmSphericalHarmonics](./wasmgpu-objects-splatfield-setwasmsphericalharmonics.md), [setWasmPackedData](./wasmgpu-objects-splatfield-setwasmpackeddata.md), [refreshFromWasm](./wasmgpu-objects-splatfield-refreshfromwasm.md), [clearWasmSources](./wasmgpu-objects-splatfield-clearwasmsources.md)

## See Also

- [SplatField.splatCount](./wasmgpu-objects-splatfield-splatcount.md)
- [SplatField.getSplatRecord](./wasmgpu-objects-splatfield-getsplatrecord.md)
- [SplatField.setWasmPackedData](./wasmgpu-objects-splatfield-setwasmpackeddata.md)
- [SplatField.upload](./wasmgpu-objects-splatfield-upload.md)
- [SplatField.destroy](./wasmgpu-objects-splatfield-destroy.md)
- [WasmGPU.gltf.import](./wasmgpu-gltf-import.md)
